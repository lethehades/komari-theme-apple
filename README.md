# Komari Theme Apple

Apple 官方网站气质的 Komari 探针主题：大留白、玻璃层次、浅深色自适应、实时状态卡、分组筛选、流量/负载/延迟与实例详情模块。

## 特性

- **Apple-like visual system**：克制排版、圆角玻璃卡、柔和渐变与轻量动效。
- **Komari compatible**：保留 `komari-theme.json` + `dist/` 的主题包结构，可直接上传到 Komari。
- **PurCarte base**：沿用 PurCarte 的 Vite React 架构、Komari API 适配、JSON-RPC2 可选支持、设置面板与多视图。
- **komari-next inspired modules**：强化首页总览、搜索/分组、状态概览、流量速率与实例详情体验。
- **Mobile first**：iPhone/Safari 视口下保持可读的卡片密度和触控尺寸。

## 开发

```bash
npm install
npm run dev
npm run build
npm run package
```

构建后主题静态文件位于 `dist/`；`npm run package` 会生成可上传的 zip 包到 `release/`。

## Komari 主题包结构

```text
komari-theme.json
preview.png
dist/
  index.html
  assets/...
```

`komari-theme.json` 中的 `short` 为 `apple`，符合 Komari 主题上传规则。

## Credits

- Based on [Montia37/komari-theme-purcarte](https://github.com/Montia37/komari-theme-purcarte) under the MIT License.
- Inspired by module ideas from [tonyliuzj/komari-next](https://github.com/tonyliuzj/komari-next) under the MIT License.
- Compatible with [komari-monitor/komari](https://github.com/komari-monitor/komari) theme packaging and serving behavior.

## License

MIT. See `LICENSE`.
