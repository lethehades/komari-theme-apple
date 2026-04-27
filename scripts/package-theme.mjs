#!/usr/bin/env node
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const meta = JSON.parse(readFileSync(path.join(root, "komari-theme.json"), "utf8"));
const version = meta.version || "0.0.0";
const releaseDir = path.join(root, "release");
const zipPath = path.join(releaseDir, `${meta.short}-${version}.zip`);

if (!existsSync(path.join(root, "dist", "index.html"))) {
  console.error("dist/index.html not found. Run npm run build first.");
  process.exit(1);
}

mkdirSync(releaseDir, { recursive: true });
if (existsSync(zipPath)) rmSync(zipPath);

const files = ["komari-theme.json", "preview.png", "README.md", "LICENSE", "NOTICE.md", "dist"];
const result = spawnSync("zip", ["-qr", zipPath, ...files], {
  cwd: root,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Created ${zipPath}`);
