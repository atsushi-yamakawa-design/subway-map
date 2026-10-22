import type { Feature, FeatureCollection, MultiLineString, Point } from "geojson";

export type BBox = [number, number, number, number];

export interface LineProps {
  id: string;
  name: string;
  shortName: string;
  prefix: string;
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

export type LineFeature = Feature<MultiLineString, LineProps>;
export type StationFeature = Feature<Point, StationProps>;

export interface Meta {
  region: string;
  bbox: BBox | null;
  generatedAt: string;
  source: string;
}

export interface OperatorInfo {
  name: string;
  short: string;
  lineCount: number;
}

export interface MapData {
  lines: FeatureCollection<MultiLineString, LineProps>;
  stations: FeatureCollection<Point, StationProps>;
  meta: Meta | null;
  lineById: Map<string, LineFeature>;
  stationById: Map<string, StationFeature>;
  operators: OperatorInfo[];
  bbox: BBox;
}
