import type { FeatureCollection, MultiLineString, Point } from "geojson";
import type { BBox, LineFeature, LineProps, MapData, Meta, OperatorInfo, StationFeature, StationProps } from "./types";

const base = import.meta.env.BASE_URL;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function loadData(): Promise<MapData> {
  const [lines, stations, meta] = await Promise.all([
    fetchJson<FeatureCollection<MultiLineString, LineProps>>("data/lines.geojson"),
    fetchJson<FeatureCollection<Point, StationProps>>("data/stations.geojson"),
    fetchJson<Meta>("data/meta.json").catch(() => null),
  ]);

  const lineById = new Map<string, LineFeature>();
  const opCount = new Map<string, OperatorInfo>();
  const bbox: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of lines.features) {
    lineById.set(f.properties.id, f);
    const b = f.properties.bbox;
    bbox[0] = Math.min(bbox[0], b[0]);
    bbox[1] = Math.min(bbox[1], b[1]);
    bbox[2] = Math.max(bbox[2], b[2]);
    bbox[3] = Math.max(bbox[3], b[3]);
    const op = opCount.get(f.properties.operator) ?? {
      name: f.properties.operator,
      short: f.properties.operatorShort,
      lineCount: 0,
    };
    op.lineCount++;
    opCount.set(f.properties.operator, op);
  }
  const stationById = new Map<string, StationFeature>();
  for (const f of stations.features) stationById.set(f.properties.id, f);

  const operators = [...opCount.values()].sort((a, b) => b.lineCount - a.lineCount || a.name.localeCompare(b.name, "ja"));

  return { lines, stations, meta, lineById, stationById, operators, bbox };
}
