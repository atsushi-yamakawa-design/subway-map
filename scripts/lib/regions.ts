import type { BBox } from "./geo.js";

/** 切り出し範囲のプリセット。REGION 環境変数で選ぶ。 */
export const REGIONS: Record<string, { label: string; bbox?: BBox }> = {
  kanto: { label: "首都圏（1都3県）", bbox: [138.7, 34.9, 140.9, 36.3] },
  kansai: { label: "関西（京阪神・奈良）", bbox: [134.5, 34.2, 136.1, 35.3] },
  nagoya: { label: "名古屋圏", bbox: [136.5, 34.8, 137.5, 35.6] },
  all: { label: "全国" },
};

export function resolveRegion(value: string | undefined): { label: string; bbox?: BBox } {
  const v = (value ?? "kanto").trim();
  if (REGIONS[v]) return REGIONS[v]!;
  const parts = v.split(",").map(Number);
  if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
    return { label: `bbox ${v}`, bbox: parts as BBox };
  }
  throw new Error(`unknown REGION "${v}". use one of ${Object.keys(REGIONS).join(", ")} or minLng,minLat,maxLng,maxLat`);
}
