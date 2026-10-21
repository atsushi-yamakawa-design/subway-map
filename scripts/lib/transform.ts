import {
  type BBox,
  type Position,
  anyInside,
  bboxContains,
  emptyBBox,
  expandBBox,
  extendBBox,
  lineMidpoint,
  shortHash,
  simplifyLine,
} from "./geo.js";
import { fallbackColor, lookupColor } from "./colors.js";
import { OPERATOR_TYPE, RAIL_TYPE, shortLineName, shortOperator } from "./names.js";

// ---- 入力（国土数値情報 N02）----
// GeoJSON 版の属性キーはコード（N02_003 など）だが、年度によって日本語キーのこともあるので両対応。
type Props = Record<string, unknown>;

interface InFeature {
  type: "Feature";
  geometry: { type: string; coordinates: unknown } | null;
  properties: Props | null;
}
export interface InFC {
  type: "FeatureCollection";
  features: InFeature[];
}

function prop(p: Props, ...keys: string[]): string {
  for (const k of keys) {
    const v = p[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return "";
}

const K = {
  railType: ["N02_001", "鉄道区分"],
  operatorType: ["N02_002", "事業者種別"],
  line: ["N02_003", "路線名"],
  operator: ["N02_004", "運営会社"],
  station: ["N02_005", "駅名"],
  stationCode: ["N02_005c", "駅コード"],
  groupCode: ["N02_005g", "グループコード"],
};

// ---- 出力 ----
export interface LineProps {
  id: string;
  name: string;
  shortName: string;
  operator: string;
  operatorShort: string;
  operatorType: string;
  railType: string;
  color: string;
  bbox: BBox;
  stationCount: number;
}

export interface StationProps {
  id: string;
  name: string;
  lines: string[];
  lineCount: number;
  operators: string[];
  color: string;
}

export interface OutLine {
  type: "Feature";
  geometry: { type: "MultiLineString"; coordinates: Position[][] };
  properties: LineProps;
}
export interface OutStation {
  type: "Feature";
  geometry: { type: "Point"; coordinates: Position };
  properties: StationProps;
}

export interface BuildOptions {
  /** 省略時は全国 */
  bbox?: BBox;
  /** Douglas-Peucker の許容誤差（度）。0 で無効 */
  tolerance: number;
}

export interface BuildResult {
  lines: { type: "FeatureCollection"; features: OutLine[] };
  stations: { type: "FeatureCollection"; features: OutStation[] };
  stats: { sectionsIn: number; sectionsKept: number; lines: number; stations: number; colored: number };
}

export function lineId(operator: string, lineName: string): string {
  return "L" + shortHash(`${operator}|${lineName}`);
}

export function buildData(railroad: InFC, station: InFC, opts: BuildOptions): BuildResult {
  const bbox = opts.bbox;

  // 1. 区間を (運営会社, 路線名) でまとめる。bbox があれば区間単位で切り出す。
  interface LineAcc {
    operator: string;
    name: string;
    operatorType: string;
    railType: string;
    parts: Position[][];
    bbox: BBox;
  }
  const lines = new Map<string, LineAcc>();
  let sectionsKept = 0;

  for (const f of railroad.features) {
    if (!f.geometry || !f.properties) continue;
    const coordsList = asLineStrings(f.geometry);
    const p = f.properties;
    const operator = prop(p, ...K.operator);
    const name = prop(p, ...K.line);
    if (!operator || !name) continue;
    const id = lineId(operator, name);
    for (const coords of coordsList) {
      if (coords.length < 2) continue;
      if (bbox && !anyInside(coords, bbox)) continue;
      sectionsKept++;
      let acc = lines.get(id);
      if (!acc) {
        acc = {
          operator,
          name,
          operatorType: prop(p, ...K.operatorType),
          railType: prop(p, ...K.railType),
          parts: [],
          bbox: emptyBBox(),
        };
        lines.set(id, acc);
      }
      const simplified = opts.tolerance > 0 ? simplifyLine(coords, opts.tolerance) : coords;
      acc.parts.push(simplified);
      for (const c of simplified) extendBBox(acc.bbox, c);
    }
  }

  // 2. 駅。グループコードで名寄せして点にする。
  interface StationAcc {
    name: string;
    points: Position[];
    lines: Set<string>;
    operators: Set<string>;
  }
  const stations = new Map<string, StationAcc>();
  const stationBBox = bbox ? expandBBox(bbox, 0.02) : undefined;
  const stationCountByLine = new Map<string, Set<string>>();

  for (const f of station.features) {
    if (!f.geometry || !f.properties) continue;
    const p = f.properties;
    const operator = prop(p, ...K.operator);
    const line = prop(p, ...K.line);
    const name = prop(p, ...K.station);
    if (!name) continue;
    const lid = lineId(operator, line);
    if (!lines.has(lid)) continue;

    const pt = pointOf(f.geometry);
    if (!pt) continue;
    if (stationBBox && !bboxContains(stationBBox, pt)) continue;

    const group = prop(p, ...K.groupCode);
    // グループコードが無い年度のデータでは、駅名 + 約500m グリッドで同一駅とみなす
    const key = group
      ? `g:${group}`
      : `n:${name}|${Math.round(pt[0] / 0.005)}|${Math.round(pt[1] / 0.005)}`;
    let acc = stations.get(key);
    if (!acc) {
      acc = { name, points: [], lines: new Set(), operators: new Set() };
      stations.set(key, acc);
    }
    acc.points.push(pt);
    acc.lines.add(lid);
    acc.operators.add(operator);

    let set = stationCountByLine.get(lid);
    if (!set) stationCountByLine.set(lid, (set = new Set()));
    set.add(key);
  }

  // 3. 出力整形
  let colored = 0;
  const lineFeatures: OutLine[] = [];
  for (const [id, acc] of lines) {
    const lookedUp = lookupColor(acc.operator, acc.name);
    if (lookedUp) colored++;
    const color = lookedUp ?? fallbackColor(parseInt(id.slice(1), 36));
    lineFeatures.push({
      type: "Feature",
      geometry: { type: "MultiLineString", coordinates: acc.parts },
      properties: {
        id,
        name: acc.name,
        shortName: shortLineName(acc.name),
        operator: acc.operator,
        operatorShort: shortOperator(acc.operator),
        operatorType: OPERATOR_TYPE[acc.operatorType] ?? acc.operatorType,
        railType: RAIL_TYPE[acc.railType] ?? acc.railType,
        color,
        bbox: acc.bbox.map((v) => Math.round(v * 1e5) / 1e5) as BBox,
        stationCount: stationCountByLine.get(id)?.size ?? 0,
      },
    });
  }
  lineFeatures.sort((a, b) =>
    a.properties.operator === b.properties.operator
      ? a.properties.name.localeCompare(b.properties.name, "ja")
      : a.properties.operator.localeCompare(b.properties.operator, "ja"),
  );

  const colorById = new Map(lineFeatures.map((f) => [f.properties.id, f.properties.color]));
  const stationFeatures: OutStation[] = [];
  for (const [key, acc] of stations) {
    const n = acc.points.length;
    const lng = acc.points.reduce((s, p) => s + p[0], 0) / n;
    const lat = acc.points.reduce((s, p) => s + p[1], 0) / n;
    const lineIds = [...acc.lines].sort();
    stationFeatures.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [round5(lng), round5(lat)] },
      properties: {
        id: "S" + shortHash(key),
        name: acc.name,
        lines: lineIds,
        lineCount: lineIds.length,
        operators: [...acc.operators].sort(),
        color: colorById.get(lineIds[0]!) ?? "#555555",
      },
    });
  }
  stationFeatures.sort((a, b) => a.properties.name.localeCompare(b.properties.name, "ja"));

  return {
    lines: { type: "FeatureCollection", features: lineFeatures },
    stations: { type: "FeatureCollection", features: stationFeatures },
    stats: {
      sectionsIn: railroad.features.length,
      sectionsKept,
      lines: lineFeatures.length,
      stations: stationFeatures.length,
      colored,
    },
  };
}

function round5(v: number): number {
  return Math.round(v * 1e5) / 1e5;
}

function asLineStrings(g: { type: string; coordinates: unknown }): Position[][] {
  if (g.type === "LineString") return [g.coordinates as Position[]];
  if (g.type === "MultiLineString") return g.coordinates as Position[][];
  return [];
}

/** 駅ジオメトリ（N02 では短い LineString）を代表点に落とす */
function pointOf(g: { type: string; coordinates: unknown }): Position | undefined {
  if (g.type === "Point") return g.coordinates as Position;
  const lines = asLineStrings(g);
  const all = lines.flat();
  if (all.length === 0) return undefined;
  return lineMidpoint(lines.length === 1 ? lines[0]! : all);
}
