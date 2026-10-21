import {
  AttributionControl,
  Map as MLMap,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
  type ExpressionSpecification,
  type FilterSpecification,
  type LngLatBoundsLike,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";

// maplibre-gl v6 は Worker を別ファイルとして読み込む。バンドラ経由だと URL が解決できないので明示する。
setWorkerUrl(workerUrl);
import type { AppState, Selection } from "./state";
import type { LineFeature, MapData, StationFeature } from "./types";

/** ベースマップ。APIキー不要の OpenFreeMap Positron（淡色）。 */
const STYLE_URL: string = import.meta.env.VITE_STYLE_URL || "https://tiles.openfreemap.org/styles/positron";

const DIM_LINE = 0.12;
const DIM_STATION = 0.15;

const SRC_LINES = "lines";
const SRC_STATIONS = "stations";
const L_CASING = "rail-casing";
const L_LINE = "rail-line";
const L_HIT = "rail-hit";
const L_LABEL = "rail-label";
const L_STATION = "station-circle";
const L_STATION_LABEL = "station-label";
const L_STATION_SELECTED = "station-selected";

export interface RailMap {
  map: MLMap;
  focusLine(id: string): void;
  focusStation(id: string): void;
}

export function createMap(container: HTMLElement, data: MapData, state: AppState): RailMap {
  const map = new MLMap({
    container,
    style: STYLE_URL,
    bounds: data.bbox as LngLatBoundsLike,
    fitBoundsOptions: { padding: 40 },
    attributionControl: false,
  });
  // ズーム + コンパス（クリックで北が上に戻る）
  map.addControl(new NavigationControl({ showCompass: true, visualizePitch: true }), "top-right");
  map.addControl(new AttributionControl({ compact: true }), "bottom-left");
  // 右下は検索 FAB に譲るので、スケールは左下
  map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

  // ホバー中は太くする。["zoom"] はトップレベルの interpolate の入力にしか置けないので、
  // 乗算は各ストップの出力側に入れる。
  const hoverW: ExpressionSpecification = ["case", ["boolean", ["feature-state", "hover"], false], 1.8, 1];
  const lineW = (z8: number, z12: number, z16: number): ExpressionSpecification => [
    "interpolate",
    ["linear"],
    ["zoom"],
    8,
    ["*", z8, hoverW],
    12,
    ["*", z12, hoverW],
    16,
    ["*", z16, hoverW],
  ];

  map.on("load", () => {
    map.addSource(SRC_LINES, { type: "geojson", data: data.lines, promoteId: "id" });
    map.addSource(SRC_STATIONS, { type: "geojson", data: data.stations, promoteId: "id" });

    // 路線: 白縁取り + 路線色。ハイライト中のものを上に出すため sort-key を使う
    map.addLayer({
      id: L_CASING,
      type: "line",
      source: SRC_LINES,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": lineW(2.5, 6, 13) },
    });
    map.addLayer({
      id: L_LINE,
      type: "line",
      source: SRC_LINES,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "color"], "line-width": lineW(1.2, 3.2, 8) },
    });
    // クリック判定用の太い透明レイヤー
    map.addLayer({
      id: L_HIT,
      type: "line",
      source: SRC_LINES,
      paint: { "line-color": "#000", "line-opacity": 0, "line-width": 16 },
    });
    map.addLayer({
      id: L_LABEL,
      type: "symbol",
      source: SRC_LINES,
      minzoom: 12.5,
      layout: {
        "symbol-placement": "line",
        "text-field": ["get", "shortName"],
        "text-size": 12,
        "text-font": ["Noto Sans Regular"],
        "symbol-spacing": 400,
        "text-max-angle": 30,
        "text-padding": 8,
      },
      paint: { "text-color": ["get", "color"], "text-halo-color": "#fff", "text-halo-width": 2 },
    });

    // 駅: 白塗り + 路線色の縁。乗換駅は少し大きく
    const transfer: ExpressionSpecification = [">", ["get", "lineCount"], 1];
    map.addLayer({
      id: L_STATION,
      type: "circle",
      source: SRC_STATIONS,
      minzoom: 10,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          ["case", transfer, 2.5, 1.5],
          13,
          ["case", transfer, 5.5, 3.5],
          16,
          ["case", transfer, 9, 6],
        ],
        "circle-color": "#ffffff",
        "circle-stroke-color": ["case", transfer, "#333333", ["get", "color"]],
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 13, 2, 16, 3],
      },
    });
    map.addLayer({
      id: L_STATION_LABEL,
      type: "symbol",
      source: SRC_STATIONS,
      minzoom: 11,
      filter: transfer, // ズーム 13 未満は乗換駅のみ（下で切替）
      layout: {
        "text-field": ["get", "name"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11, 11, 15, 14],
        "text-font": ["Noto Sans Regular"],
        "text-offset": [0, 0.9],
        "text-anchor": "top",
        "text-optional": true,
        "symbol-sort-key": ["-", 10, ["get", "lineCount"]],
      },
      paint: { "text-color": "#1a1a1a", "text-halo-color": "#ffffff", "text-halo-width": 2 },
    });
    map.addLayer({
      id: L_STATION_SELECTED,
      type: "circle",
      source: SRC_STATIONS,
      filter: ["==", ["get", "id"], ""],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 16, 18],
        "circle-color": "rgba(37, 99, 235, 0.18)",
        "circle-stroke-color": "#2563eb",
        "circle-stroke-width": 2,
      },
    });

    applySelection(state.get());
    wireInteractions();
  });

  // ---- 選択状態をスタイルに反映 ----
  function highlightedLines(sel: Selection): string[] {
    const ids = new Set(sel.lines);
    if (sel.station) {
      const st = data.stationById.get(sel.station);
      if (st) for (const l of st.properties.lines) ids.add(l);
    }
    return [...ids];
  }

  function applySelection(sel: Selection): void {
    if (!map.getLayer(L_LINE)) return;
    const hi = highlightedLines(sel);
    const hasHi = hi.length > 0;
    const all: FilterSpecification = ["literal", true];

    const lineIsHi: ExpressionSpecification = hasHi ? ["in", ["get", "id"], ["literal", hi]] : ["literal", true];
    const lineFilter: FilterSpecification = all;
    const lineOpacity: ExpressionSpecification = hasHi ? ["case", lineIsHi, 1, DIM_LINE] : ["literal", 1];
    const sortKey: ExpressionSpecification = ["case", lineIsHi, 1, 0];

    for (const id of [L_CASING, L_LINE, L_HIT]) map.setFilter(id, lineFilter);
    map.setPaintProperty(L_CASING, "line-opacity", lineOpacity);
    map.setPaintProperty(L_LINE, "line-opacity", lineOpacity);
    map.setLayoutProperty(L_CASING, "line-sort-key", sortKey);
    map.setLayoutProperty(L_LINE, "line-sort-key", sortKey);
    map.setFilter(L_LABEL, hasHi ? lineIsHi : all);

    const stIsHi: ExpressionSpecification = hasHi
      ? ["any", ...hi.map((id): ExpressionSpecification => ["in", id, ["get", "lines"]])]
      : ["literal", true];
    map.setFilter(L_STATION, all);
    map.setPaintProperty(L_STATION, "circle-opacity", hasHi ? ["case", stIsHi, 1, DIM_STATION] : 1);
    map.setPaintProperty(L_STATION, "circle-stroke-opacity", hasHi ? ["case", stIsHi, 1, DIM_STATION] : 1);

    // ラベル: 何か選んでいるときはその路線の全駅、通常時は 13 未満で乗換駅のみ
    const labelFilter: FilterSpecification = hasHi
      ? stIsHi
      : ["any", [">=", ["zoom"], 13], [">", ["get", "lineCount"], 1]];
    map.setFilter(L_STATION_LABEL, labelFilter);

    map.setFilter(L_STATION_SELECTED, ["==", ["get", "id"], sel.station ?? ""]);
  }

  state.subscribe((sel) => applySelection(sel));

  // ---- マウス操作 ----
  let hovered: string | null = null;
  let popup: Popup | null = null;

  function wireInteractions(): void {
    map.on("mousemove", (e) => {
      const feats = map.queryRenderedFeatures(e.point, { layers: [L_STATION, L_HIT] });
      const f = feats[0];
      const nextLine = f && f.layer.id === L_HIT ? String(f.properties["id"]) : null;
      if (hovered !== nextLine) {
        if (hovered) map.setFeatureState({ source: SRC_LINES, id: hovered }, { hover: false });
        if (nextLine) map.setFeatureState({ source: SRC_LINES, id: nextLine }, { hover: true });
        hovered = nextLine;
      }
      map.getCanvas().style.cursor = f ? "pointer" : "";
    });

    map.on("click", (e) => {
      const feats = map.queryRenderedFeatures(e.point, { layers: [L_STATION, L_HIT] });
      const station = feats.find((f) => f.layer.id === L_STATION);
      if (station) {
        const id = String(station.properties["id"]);
        openStationPopup(id);
        state.selectStation(id);
        return;
      }
      const line = feats.find((f) => f.layer.id === L_HIT);
      if (line) {
        state.toggleLine(String(line.properties["id"]));
        return;
      }
      popup?.remove();
      if (state.get().station) state.selectStation(null);
    });
  }

  function openStationPopup(id: string): void {
    const st = data.stationById.get(id);
    if (!st) return;
    popup?.remove();
    const el = document.createElement("div");
    const title = document.createElement("div");
    title.className = "popup-title";
    title.textContent = st.properties.name;
    el.appendChild(title);
    for (const lid of st.properties.lines) {
      const line = data.lineById.get(lid);
      if (!line) continue;
      const btn = document.createElement("button");
      btn.className = "popup-line";
      btn.type = "button";
      btn.innerHTML = `<span class="dot"></span><span></span><span class="op"></span>`;
      (btn.children[0] as HTMLElement).style.background = line.properties.color;
      btn.children[1]!.textContent = line.properties.shortName;
      btn.children[2]!.textContent = line.properties.operatorShort;
      btn.addEventListener("click", () => state.toggleLine(lid));
      el.appendChild(btn);
    }
    popup = new Popup({ offset: 12, closeButton: false, maxWidth: "280px" })
      .setLngLat(st.geometry.coordinates as [number, number])
      .setDOMContent(el)
      .addTo(map);
  }

  function focusLine(id: string): void {
    const f: LineFeature | undefined = data.lineById.get(id);
    if (!f) return;
    map.fitBounds(f.properties.bbox as LngLatBoundsLike, { padding: 60, duration: 700, maxZoom: 13 });
  }

  function focusStation(id: string): void {
    const f: StationFeature | undefined = data.stationById.get(id);
    if (!f) return;
    map.flyTo({ center: f.geometry.coordinates as [number, number], zoom: Math.max(map.getZoom(), 14), duration: 700 });
    openStationPopup(id);
  }

  return { map, focusLine, focusStation };
}
