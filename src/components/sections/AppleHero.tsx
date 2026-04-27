import { Activity, Gauge, Globe2, Search, Server, Sparkles, Wifi } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { NodeData } from "@/types/node";
import { formatBytes } from "@/utils";
import type { StatsSnapshot } from "./StatsBar/types";

interface AppleHeroProps {
  stats: StatsSnapshot;
  loading: boolean;
  nodes: (NodeData & { stats?: any })[];
  groups: string[];
  selectedGroup: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  title?: string;
}

const formatPercent = (value: number) => `${Math.max(0, Math.min(100, value)).toFixed(0)}%`;

export function AppleHero({
  stats,
  loading,
  nodes,
  groups,
  selectedGroup,
  searchTerm,
  setSearchTerm,
  title,
}: AppleHeroProps) {
  const onlineRatio = stats.totalCount
    ? (stats.onlineCount / stats.totalCount) * 100
    : 0;
  const onlineNodes = nodes.filter((node) => node.stats?.online);
  const averageLoad = onlineNodes.length
    ? onlineNodes.reduce((sum, node) => sum + Number(node.stats?.load || 0), 0) /
      onlineNodes.length
    : 0;
  const groupCount = Math.max(0, groups.length - 1);
  const displayTitle = title?.trim() || "Komari";

  const metrics = [
    {
      icon: Server,
      label: "Online Fleet",
      value: loading ? "…" : `${stats.onlineCount}/${stats.totalCount}`,
      detail: `${formatPercent(onlineRatio)} available`,
    },
    {
      icon: Globe2,
      label: "Regions",
      value: loading ? "…" : `${stats.uniqueRegions}`,
      detail: groupCount ? `${groupCount} groups · ${selectedGroup}` : selectedGroup,
    },
    {
      icon: Wifi,
      label: "Live Speed",
      value: loading
        ? "…"
        : `${formatBytes(stats.currentSpeedDown, true, 1)}`,
      detail: `↑ ${formatBytes(stats.currentSpeedUp, true, 1)}`,
    },
    {
      icon: Gauge,
      label: "Avg Load",
      value: loading || !onlineNodes.length ? "—" : averageLoad.toFixed(2),
      detail: `${formatBytes(stats.totalTrafficUp + stats.totalTrafficDown, false, 1)} traffic`,
    },
  ];

  return (
    <section className="apple-hero" aria-label="Dashboard overview">
      <div className="apple-hero__glow apple-hero__glow--blue" />
      <div className="apple-hero__glow apple-hero__glow--pink" />
      <div className="apple-hero__content">
        <div className="apple-eyebrow">
          <Sparkles className="size-4" />
          Apple Edition for Komari
        </div>
        <h1 className="apple-hero__title">
          {displayTitle}
          <span>Infrastructure, refined.</span>
        </h1>
        <p className="apple-hero__subtitle">
          一个更接近 Apple 官网气质的 Komari 探针主题：克制留白、玻璃层次、实时状态与设备细节都集中在清爽的控制面板里。
        </p>

        <div className="apple-hero__actions">
          <label className="apple-search" aria-label="Search nodes">
            <Search className="size-4" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search nodes, regions, groups…"
              className="apple-search__input"
            />
          </label>
          <div className="apple-live-pill">
            <Activity className="size-4" />
            <span>{stats.onlineCount > 0 ? "Live telemetry" : "Waiting for data"}</span>
          </div>
        </div>
      </div>

      <div className="apple-hero__metrics">
        {metrics.map(({ icon: Icon, label, value, detail }) => (
          <div className="apple-metric-card" key={label}>
            <div className="apple-metric-card__icon">
              <Icon className="size-4" />
            </div>
            <div>
              <div className="apple-metric-card__label">{label}</div>
              <div className="apple-metric-card__value">{value}</div>
              <div className="apple-metric-card__detail">{detail}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
