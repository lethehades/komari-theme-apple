import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatBytes,
  formatUptime,
  getOSImage,
  formatTrafficLimit,
} from "@/utils";
import type { NodeData, PingHistoryResponse } from "@/types/node";
import type { RpcNodeStatus } from "@/types/rpc";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  CpuIcon,
  HardDriveIcon,
  Info,
  MemoryStickIcon,
  Network,
  RadioTower,
  TrendingUp,
} from "lucide-react";
import Flag from "./Flag";
import { Tag } from "../ui/tag";
import { useNodeCommons } from "@/hooks/useNodeCommons";
import { useAppConfig } from "@/config";
import { useLocale } from "@/config/hooks";
import { NodeDisplayContainer } from "./NodeDisplay";
import { usePingChart } from "@/hooks/usePingChart";

interface NodeGridContainerProps {
  nodes: NodeData[];
  enableSwap: boolean;
  selectTrafficProgressStyle: "circular" | "linear";
}

type NodeWithLiveStats = NodeData & { stats?: RpcNodeStatus };

export const NodeGridContainer = ({
  nodes,
  enableSwap,
  selectTrafficProgressStyle,
}: NodeGridContainerProps) => {
  return (
    <NodeDisplayContainer nodes={nodes}>
      {(node, onShowDetails) => (
        <NodeGrid
          key={node.uuid}
          node={node as NodeWithLiveStats}
          enableSwap={enableSwap}
          selectTrafficProgressStyle={selectTrafficProgressStyle}
          onShowDetails={onShowDetails}
        />
      )}
    </NodeDisplayContainer>
  );
};

interface NodeGridProps {
  node: NodeWithLiveStats;
  enableSwap: boolean;
  selectTrafficProgressStyle: "circular" | "linear";
  onShowDetails: () => void;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function ResourceRing({
  label,
  value,
  detail,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  color: string;
  icon: typeof CpuIcon;
}) {
  const percentage = clampPercent(value);

  return (
    <div className="apple-node-resource">
      <div
        className="apple-node-resource__ring"
        style={{
          "--apple-resource-value": `${percentage}%`,
          "--apple-resource-color": color,
        } as React.CSSProperties}>
        <span>{percentage.toFixed(0)}%</span>
      </div>
      <strong>
        <Icon className="size-3.5" />
        {label}
      </strong>
      <small>{detail}</small>
    </div>
  );
}

function getAverageLatency(history: PingHistoryResponse | null) {
  const values = history?.records
    ?.map((record) => Number(record.value))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (!values?.length) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getAveragePacketLoss(history: PingHistoryResponse | null) {
  const values = history?.tasks
    ?.map((task) => Number(task.loss))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (!values?.length) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function AppleHistoryBars({ node }: { node: NodeData }) {
  const { loading, pingHistory } = usePingChart(node, 24);
  const records = pingHistory?.records?.slice(-28) ?? [];
  const latencyValues = records.map((record) => Math.max(0, Number(record.value) || 0));
  const maxLatency = Math.max(1, ...latencyValues);
  const averageLatency = getAverageLatency(pingHistory);
  const packetLoss = getAveragePacketLoss(pingHistory);
  const lossBars = Array.from({ length: 28 }, (_, index) => {
    const base = packetLoss ?? 0;
    return Math.min(100, Math.max(3, base + ((index % 5) - 2) * 0.4));
  });

  return (
    <div className="apple-node-history">
      <div className="apple-node-history__header">
        <span>延迟统计（24h）</span>
        <span>
          {loading
            ? "同步中"
            : averageLatency !== null
            ? `${averageLatency.toFixed(0)} ms`
            : "暂无记录"}
        </span>
      </div>
      <div className="apple-node-bars">
        <div>
          <label>Latency</label>
          <div className="apple-node-bar-strip is-latency">
            {(latencyValues.length ? latencyValues : Array(28).fill(0)).map((value, index) => (
              <i
                key={`${node.uuid}-latency-${index}`}
                style={{ height: `${latencyValues.length ? Math.max(12, (value / maxLatency) * 100) : 12}%` }}
              />
            ))}
          </div>
        </div>
        <div>
          <label>丢包</label>
          <div className="apple-node-bar-strip is-loss">
            {lossBars.map((value, index) => (
              <i key={`${node.uuid}-loss-${index}`} style={{ height: `${value}%` }} />
            ))}
          </div>
        </div>
      </div>
      <div className="apple-node-history__footer">
        <span>MAX Limit</span>
        <span>{packetLoss !== null ? `${packetLoss.toFixed(1)}% 波动` : "等待探针记录"}</span>
      </div>
    </div>
  );
}

export const NodeGrid = ({
  node,
  enableSwap,
  selectTrafficProgressStyle,
  onShowDetails,
}: NodeGridProps) => {
  const {
    stats,
    isOnline,
    tagList,
    cpuUsage,
    memUsage,
    swapUsage,
    diskUsage,
    load,
    expired_at,
    trafficPercentage,
  } = useNodeCommons(node);
  const {
    isShowValueUnderProgressBar,
    enableNodeHistoryBars,
    enableCompactNetworkGauge,
  } = useAppConfig();
  const { t } = useLocale();

  const totalTraffic = stats ? stats.net_total_up + stats.net_total_down : 0;
  const memoryDetail = stats
    ? `${formatBytes(stats.ram, false, 1)} / ${formatBytes(node.mem_total, false, 1)}`
    : formatBytes(node.mem_total, false, 1);
  const diskDetail = stats
    ? `${formatBytes(stats.disk, false, 1)} / ${formatBytes(node.disk_total, false, 1)}`
    : formatBytes(node.disk_total, false, 1);
  const cpuDetail = `${node.cpu_cores} ${t("node.cores")}`;

  return (
    <Card
      className={`apple-node-card${isOnline ? "" : " is-offline"}`}
      data-traffic-style={selectTrafficProgressStyle}>
      <CardHeader className="apple-node-card__header">
        <Link to={`/instance/${node.uuid}`} className="apple-node-card__identity">
          <Flag flag={node.region} />
          <div>
            <CardTitle className="apple-node-card__title">{node.name}</CardTitle>
            <span>
              <img src={getOSImage(node.os)} alt={node.os} loading="lazy" />
              {node.virtualization || node.os || node.arch}
              {isOnline && stats ? ` · ${formatUptime(stats.uptime)}` : ""}
            </span>
          </div>
        </Link>
        <div className="apple-node-card__actions">
          <TrendingUp className="size-4" />
          <span className={`apple-status-badge${isOnline ? " is-online" : " is-offline"}`}>
            {isOnline ? "在线" : "离线"}
          </span>
          <button type="button" onClick={onShowDetails} aria-label={`${node.name} details`}>
            <Info className="size-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="apple-node-card__content">
        <div className="apple-node-resource-grid">
          <ResourceRing
            label={t("node.cpu")}
            value={cpuUsage}
            detail={cpuDetail}
            color="var(--apple-blue)"
            icon={CpuIcon}
          />
          <ResourceRing
            label={t("node.mem")}
            value={memUsage}
            detail={memoryDetail}
            color="#5e9ff2"
            icon={MemoryStickIcon}
          />
          <ResourceRing
            label={t("node.disk")}
            value={diskUsage}
            detail={diskDetail}
            color="#4da3ff"
            icon={HardDriveIcon}
          />
        </div>

        {enableCompactNetworkGauge && (
          <div className="apple-node-network-panel">
            <div className="apple-node-panel-row apple-node-panel-row--title">
              <span>
                <Network className="size-4" />
                {t("node.network")}
              </span>
              <span>
                <ArrowUp className="size-3.5" />
                {stats ? formatBytes(stats.net_out, true, 1) : t("node.notAvailable")}
              </span>
              <span>
                <ArrowDown className="size-3.5" />
                {stats ? formatBytes(stats.net_in, true, 1) : t("node.notAvailable")}
              </span>
            </div>
            <div className="apple-node-panel-row">
              <span>总流量</span>
              <span>↑ {stats ? formatBytes(stats.net_total_up, false, 1) : t("node.notAvailable")}</span>
              <span>↓ {stats ? formatBytes(stats.net_total_down, false, 1) : t("node.notAvailable")}</span>
            </div>
            <div className="apple-node-panel-row">
              <span>{t("node.load")}</span>
              <span>{load}</span>
            </div>
            {enableSwap && (
              <div className="apple-node-panel-row">
                <span>{t("node.swap")}</span>
                <span>{node.swap_total ? `${swapUsage.toFixed(0)}%` : t("node.off")}</span>
              </div>
            )}
            {isShowValueUnderProgressBar && (
              <div className="apple-node-traffic-limit">
                <div>
                  <span>{formatTrafficLimit(node.traffic_limit, node.traffic_limit_type)}</span>
                  <span>{formatBytes(totalTraffic, false, 1)}</span>
                </div>
                <i>
                  <b style={{ width: `${Math.min(100, trafficPercentage)}%` }} />
                </i>
                <em>{node.traffic_limit ? `${trafficPercentage.toFixed(3)}%` : expired_at}</em>
              </div>
            )}
          </div>
        )}

        {enableNodeHistoryBars && <AppleHistoryBars node={node} />}

        <div className="apple-node-tags">
          {tagList.length ? <Tag tags={tagList} /> : <span>{expired_at}</span>}
          <span className="apple-node-remark">
            <RadioTower className="size-3.5" />
            {node.group || node.public_remark || node.region}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
