import type { NodeData } from "@/types/node";
import type { RpcNodeStatusMap } from "@/types/rpc";
import { resolveFlagCode } from "@/utils/flag";
import { emojiToRegionMap } from "@/utils/regionHelper";

type RegionStatus = "online" | "offline" | "partial";

type RegionMeta = {
  key: string;
  label: string;
  mapName: string;
  flagCode: string;
};

const regionMetaOverridesByFlagCode: Record<
  string,
  Partial<Pick<RegionMeta, "label" | "mapName">>
> = {
  US: { label: "United States", mapName: "United States of America" },
  MO: { label: "Macau", mapName: "Macao" },
  HK: { label: "Hong Kong", mapName: "Hong Kong" },
  RU: { label: "Russia", mapName: "Russia" },
  KR: { label: "South Korea", mapName: "South Korea" },
};

const englishRegionDisplayNames =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export interface MapRegionSummary {
  emoji: string;
  key: string;
  label: string;
  mapName: string;
  flagCode: string;
  total: number;
  online: number;
  offline: number;
  status: RegionStatus;
  nodes: NodeData[];
}

export interface MapViewSummary {
  regions: MapRegionSummary[];
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  unmappedNodes: NodeData[];
}

function getRegionStatus(online: number, offline: number): RegionStatus {
  if (online === 0) return "offline";
  if (offline === 0) return "online";
  return "partial";
}

function resolveRegionMetaFromFlagCode(flagCode: string): RegionMeta | null {
  if (flagCode === "UN") return null;

  const displayName = englishRegionDisplayNames?.of(flagCode)?.trim();
  if (!displayName) return null;

  const overrides = regionMetaOverridesByFlagCode[flagCode];

  return {
    key: flagCode,
    label: overrides?.label ?? displayName,
    mapName: overrides?.mapName ?? displayName,
    flagCode,
  };
}

function resolveRegionMeta(region: string): RegionMeta | null {
  const flagCode = resolveFlagCode(region);
  const standardizedMeta = resolveRegionMetaFromFlagCode(flagCode);
  if (standardizedMeta) return standardizedMeta;

  const regionInfo = emojiToRegionMap[region];
  if (!regionInfo) return null;

  return {
    key: flagCode,
    label: regionInfo.en,
    mapName: regionInfo.en,
    flagCode,
  };
}

function isNodeOnline(node: NodeData, liveData: RpcNodeStatusMap | null) {
  return Boolean(liveData?.[node.uuid]?.online);
}

export function buildMapViewSummary(
  nodes: NodeData[],
  liveData: RpcNodeStatusMap | null
): MapViewSummary {
  const regionMap = new Map<string, MapRegionSummary>();
  const unmappedNodes: NodeData[] = [];

  for (const node of nodes) {
    const regionMeta = resolveRegionMeta(node.region);

    if (!regionMeta) {
      unmappedNodes.push(node);
      continue;
    }

    const online = isNodeOnline(node, liveData);
    const existing = regionMap.get(regionMeta.key);

    if (existing) {
      existing.nodes.push(node);
      existing.total += 1;
      if (online) existing.online += 1;
      else existing.offline += 1;
      existing.status = getRegionStatus(existing.online, existing.offline);
      continue;
    }

    regionMap.set(regionMeta.key, {
      emoji: node.region,
      key: regionMeta.key,
      label: regionMeta.label,
      mapName: regionMeta.mapName,
      flagCode: regionMeta.flagCode,
      total: 1,
      online: online ? 1 : 0,
      offline: online ? 0 : 1,
      status: online ? "online" : "offline",
      nodes: [node],
    });
  }

  const regions = Array.from(regionMap.values()).sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total;
    if (right.online !== left.online) return right.online - left.online;
    return left.label.localeCompare(right.label);
  });

  const onlineNodes = nodes.filter((node) => isNodeOnline(node, liveData)).length;

  return {
    regions,
    totalNodes: nodes.length,
    onlineNodes,
    offlineNodes: nodes.length - onlineNodes,
    unmappedNodes,
  };
}
