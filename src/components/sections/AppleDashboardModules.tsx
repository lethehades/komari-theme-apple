import { useMemo, useState, type CSSProperties, type PointerEvent } from "react";
import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { Calculator, MapPinned } from "lucide-react";
import type { NodeData } from "@/types/node";
import type { RpcNodeStatusMap } from "@/types/rpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Flag from "@/components/sections/Flag";
import worldCountries50m from "@/data/world-countries-50m.json";
import { buildMapViewSummary, type MapRegionSummary } from "@/utils/mapRegions";
import {
  buildRemainingValueSnapshot,
  formatMoney,
  formatRemainingDays,
} from "@/utils/remainingValue";

interface AppleDashboardModulesProps {
  nodes: NodeData[];
  liveData: RpcNodeStatusMap | null;
  enableWorldMap: boolean;
  enableRemainingValueCalculator: boolean;
}

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 560;

type HoverState = {
  regionKey: string;
  x: number;
  y: number;
  horizontal: "left" | "right";
  vertical: "above" | "below";
};

function getStatusLabel(status: MapRegionSummary["status"]) {
  if (status === "online") return "全部在线";
  if (status === "offline") return "全部离线";
  return "部分在线";
}

function getHoverPosition(event: PointerEvent<SVGPathElement>) {
  const x = event.clientX;
  const y = event.clientY;
  return {
    x,
    y,
    horizontal: x > window.innerWidth - 360 ? "left" : "right",
    vertical: y > window.innerHeight - 260 ? "above" : "below",
  } as const;
}

function AppleWorldMap({
  nodes,
  liveData,
}: {
  nodes: NodeData[];
  liveData: RpcNodeStatusMap | null;
}) {
  const summary = useMemo(() => buildMapViewSummary(nodes, liveData), [nodes, liveData]);
  const [hover, setHover] = useState<HoverState | null>(null);
  const activeRegionsByMapName = useMemo(
    () => new Map(summary.regions.map((region) => [region.mapName, region])),
    [summary.regions]
  );
  const hoverRegion = summary.regions.find((region) => region.key === hover?.regionKey) ?? null;

  const projectedMap = useMemo(() => {
    const countriesGeo = feature(
      worldCountries50m as never,
      (worldCountries50m as unknown as { objects: { countries: never } }).objects.countries
    ) as unknown as { features: Array<{ id?: string; properties?: { name?: string } }> };

    const projection = geoNaturalEarth1().fitExtent(
      [
        [24, 34],
        [SVG_WIDTH - 24, SVG_HEIGHT - 42],
      ],
      countriesGeo as never
    );
    const pathGenerator = geoPath(projection);

    return {
      spherePath: pathGenerator({ type: "Sphere" }) ?? "",
      graticulePath: pathGenerator(geoGraticule10()) ?? "",
      countries: countriesGeo.features
        .map((country) => {
          const name = country.properties?.name ?? String(country.id ?? "unknown");
          return {
            name,
            pathData: pathGenerator(country as never) ?? "",
            region: activeRegionsByMapName.get(name) ?? null,
          };
        })
        .filter((country) => country.pathData),
    };
  }, [activeRegionsByMapName]);

  return (
    <Card className="apple-feature-card apple-map-card">
      <CardHeader className="apple-feature-card__header">
        <div>
          <div className="apple-feature-kicker">
            <MapPinned className="size-4" />
            World map
          </div>
          <CardTitle className="apple-feature-title">全球节点分布</CardTitle>
          <p className="apple-feature-subtitle">
            按地区展示在线状态，悬停即可查看该区域节点明细。
          </p>
        </div>
        <div className="apple-feature-stats">
          <span>{summary.regions.length} 区域</span>
          <span>{summary.onlineNodes}/{summary.totalNodes} 在线</span>
        </div>
      </CardHeader>
      <CardContent className="apple-feature-card__content">
        <div className="apple-world-map">
          <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="apple-world-map__svg" role="img" aria-label="Global node distribution map">
            <path d={projectedMap.spherePath} className="apple-world-map__ocean" />
            <path d={projectedMap.graticulePath} className="apple-world-map__graticule" />
            <g>
              {projectedMap.countries.map((country) => {
                const region = country.region;
                const selected = region && hover?.regionKey === region.key;
                return (
                  <path
                    key={country.name}
                    d={country.pathData}
                    className={`apple-world-map__country${region ? ` is-active status-${region.status}` : ""}${selected ? " is-selected" : ""}`}
                    onPointerEnter={region ? (event) => setHover({ regionKey: region.key, ...getHoverPosition(event) }) : undefined}
                    onPointerMove={region ? (event) => setHover({ regionKey: region.key, ...getHoverPosition(event) }) : undefined}
                    onPointerLeave={region ? () => setHover(null) : undefined}
                  />
                );
              })}
            </g>
          </svg>
          <div className="apple-world-map__legend">
            <span><i className="status-online" />全部在线</span>
            <span><i className="status-partial" />部分在线</span>
            <span><i className="status-offline" />全部离线</span>
          </div>
          {hover && hoverRegion && (
            <div
              className="apple-map-hover"
              data-horizontal={hover.horizontal}
              data-vertical={hover.vertical}
              style={{
                "--apple-map-hover-x": `${hover.x}px`,
                "--apple-map-hover-y": `${hover.y}px`,
              } as CSSProperties}>
              <div className="apple-map-hover__title">
                <Flag flag={hoverRegion.emoji} />
                <div>
                  <strong>{hoverRegion.label}</strong>
                  <span>{getStatusLabel(hoverRegion.status)}</span>
                </div>
              </div>
              <div className="apple-map-hover__meta">
                <span>{hoverRegion.total} 节点</span>
                <span>{hoverRegion.online} 在线</span>
                <span>{hoverRegion.offline} 离线</span>
              </div>
              <div className="apple-map-hover__nodes">
                {hoverRegion.nodes.slice(0, 6).map((node) => (
                  <span key={node.uuid}>{node.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        {summary.unmappedNodes.length > 0 && (
          <div className="apple-unmapped-row">
            未映射地区：{summary.unmappedNodes.slice(0, 4).map((node) => node.region || node.name).join(" · ")}
            {summary.unmappedNodes.length > 4 ? ` 等 ${summary.unmappedNodes.length} 个` : ""}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RemainingValueCard({ nodes }: { nodes: NodeData[] }) {
  const snapshot = useMemo(() => buildRemainingValueSnapshot(nodes), [nodes]);
  const grouped = useMemo(() => {
    const map = new Map<string, { remaining: number; monthly: number; count: number }>();
    for (const node of snapshot.active) {
      const item = map.get(node.currencyCode) ?? { remaining: 0, monthly: 0, count: 0 };
      item.remaining += node.remainingValueOriginal;
      item.monthly += node.monthlyCostOriginal;
      item.count += 1;
      map.set(node.currencyCode, item);
    }
    return Array.from(map.entries());
  }, [snapshot.active]);
  const topNodes = snapshot.active.slice(0, 4);

  return (
    <Card className="apple-feature-card apple-value-card">
      <CardHeader className="apple-feature-card__header">
        <div>
          <div className="apple-feature-kicker">
            <Calculator className="size-4" />
            Value calculator
          </div>
          <CardTitle className="apple-feature-title">剩余价值计算器</CardTitle>
          <p className="apple-feature-subtitle">按价格、账期和到期时间估算当前资产剩余价值。</p>
        </div>
      </CardHeader>
      <CardContent className="apple-feature-card__content">
        <div className="apple-value-summary">
          {grouped.length > 0 ? (
            grouped.map(([currency, item]) => (
              <div key={currency}>
                <span>剩余价值</span>
                <strong>{formatMoney(item.remaining, currency)}</strong>
                <small>约 {formatMoney(item.monthly, currency)} / 月 · {item.count} 台</small>
              </div>
            ))
          ) : (
            <div>
              <span>剩余价值</span>
              <strong>暂无可计算节点</strong>
              <small>{snapshot.skipped.length} 台缺少价格或到期数据</small>
            </div>
          )}
        </div>
        <div className="apple-value-list">
          {topNodes.map((node) => (
            <div className="apple-value-row" key={node.uuid}>
              <div>
                <strong>{node.name}</strong>
                <span>{formatRemainingDays(node.remainingMs, node.isLongTerm)}</span>
              </div>
              <div className="apple-value-row__bar">
                <i style={{ width: `${Math.min(100, node.remainingRatio * 100)}%` }} />
              </div>
              <em>{formatMoney(node.remainingValueOriginal, node.currencyCode)}</em>
            </div>
          ))}
        </div>
        <div className="apple-value-footnote">
          {snapshot.expired.length} 台已过期 · {snapshot.skipped.length} 台暂不可计算
        </div>
      </CardContent>
    </Card>
  );
}

export function AppleDashboardModules({
  nodes,
  liveData,
  enableWorldMap,
  enableRemainingValueCalculator,
}: AppleDashboardModulesProps) {
  if (!enableWorldMap && !enableRemainingValueCalculator) {
    return null;
  }

  const isSingleModule = !enableWorldMap || !enableRemainingValueCalculator;

  return (
    <section
      id="apple-dashboard-modules"
      className={`apple-dashboard-modules${isSingleModule ? " is-single-module" : ""}`}>
      {enableWorldMap && <AppleWorldMap nodes={nodes} liveData={liveData} />}
      {enableRemainingValueCalculator && (
        <div className="apple-dashboard-modules__side">
          <RemainingValueCard nodes={nodes} />
        </div>
      )}
    </section>
  );
}
