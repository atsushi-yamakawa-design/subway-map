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

// 路線は「デフォルト」と「フォーカス」の 2 状態
const LINE_DEFAULT_OPACITY = 0.6;
const LINE_FOCUS_WIDTH = 1.7; // デフォルト比
const STATION_DEFAULT_OPACITY = 0.75;

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
  /** 選択を全部解除してポップアップを閉じ、全体表示（北が上）に戻す */
  resetView(): void;
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
  map.addControl(
    new AttributionControl({
      compact: true,
      customAttribution:
        '出典: <a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html" target="_blank" rel="noopener">国土数値情報（鉄道データ）</a> 国土交通省',
    }),
    "bottom-left",
  );
  // 右下は検索 FAB に譲るので、スケールは左下
  map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

  // ホバー中は太くする。["zoom"] はトップレベルの interpolate の入力にしか置けないので、
  // 乗算は各ストップの出力側に入れる。
  const hoverW: ExpressionSpecification = ["case", ["boolean", ["feature-state", "hover"], false], 1.5, 1];
  const lineW = (z8: number, z12: number, z16: number, focusW: ExpressionSpecification): ExpressionSpecification => [
    "interpolate",
    ["linear"],
    ["zoom"],
    8,
    ["*", z8, hoverW, focusW],
    12,
    ["*", z12, hoverW, focusW],
    16,
    ["*", z16, hoverW, focusW],
  ];
  const noFocusW: ExpressionSpecification = ["literal", 1];

  map.on("load", () => {
    tintBasemap();
    map.addSource(SRC_LINES, { type: "geojson", data: data.lines, promoteId: "id" });
    map.addSource(SRC_STATIONS, { type: "geojson", data: data.stations, promoteId: "id" });

    // 路線: 白縁取り + 路線色。ハイライト中のものを上に出すため sort-key を使う
    map.addLayer({
      id: L_CASING,
      type: "line",
      source: SRC_LINES,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": lineW(2.5, 6, 13, noFocusW), "line-opacity": LINE_DEFAULT_OPACITY },
    });
    map.addLayer({
      id: L_LINE,
      type: "line",
      source: SRC_LINES,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "color"], "line-width": lineW(1.2, 3.2, 8, noFocusW), "line-opacity": LINE_DEFAULT_OPACITY },
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
        "circle-opacity": STATION_DEFAULT_OPACITY,
        "circle-stroke-opacity": STATION_DEFAULT_OPACITY,
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
    addPoiLabels();

    // 出典は最初から折りたたんでおく（ⓘ をクリックで展開）
    const attrib = container.querySelector<HTMLDetailsElement>("details.maplibregl-ctrl-attrib");
    if (attrib) attrib.open = false;
  });

  // ---- ベースマップの色味 ----
  // Positron は無彩色寄りなので、背景・水・緑地・建物だけ暖色寄りに差し替えてポップにする。
  // レイヤー名はスタイル側の都合で変わりうるので、id のパターンと種類で当てる。
  function tintBasemap(): void {
    const rules: Array<{ test: RegExp; types: string[]; prop: string; value: string }> = [
      { test: /^background$|background/, types: ["background"], prop: "background-color", value: "#fdf8ec" },
      { test: /water/, types: ["fill"], prop: "fill-color", value: "#bfe2f4" },
      { test: /water/, types: ["line"], prop: "line-color", value: "#a6d3ea" },
      { test: /park|grass|wood|green|forest|cemetery|golf|pitch|garden|nature/, types: ["fill"], prop: "fill-color", value: "#d3eab8" },
      { test: /building/, types: ["fill"], prop: "fill-color", value: "#f2e4c4" },
      { test: /building/, types: ["fill"], prop: "fill-outline-color", value: "#e6d4ad" },
      { test: /residential|landuse|land_/, types: ["fill"], prop: "fill-color", value: "#f9f1de" },
    ];
    for (const layer of map.getStyle().layers) {
      for (const r of rules) {
        if (!r.types.includes(layer.type) || !r.test.test(layer.id)) continue;
        try {
          // プロパティ名は動的なので型の網をくぐる
          (map as unknown as { setPaintProperty(id: string, prop: string, value: unknown): void }).setPaintProperty(
            layer.id,
            r.prop,
            r.value,
          );
        } catch {
          /* そのプロパティを持たないレイヤーは無視 */
        }
      }
    }
  }

  // ---- 拡大時のスポット名（ベースマップの OSM POI レイヤーを流用）----
  // Positron スタイルは POI を描かないので、同じベクタータイルの poi レイヤーから
  // 名前だけを薄く出す。路線・駅のラベルより後に追加して優先度を下げる。
  function addPoiLabels(): void {
    const style = map.getStyle();
    const sourceId = Object.entries(style.sources).find(([, src]) => src.type === "vector")?.[0];
    if (!sourceId) return;
    const addIfPossible = () => {
      if (map.getLayer("poi-labels")) return;
      const src = map.getSource(sourceId) as { vectorLayerIds?: string[] } | undefined;
      // TileJSON に層一覧があって poi が無いなら諦める。一覧が無ければ試す
      if (src?.vectorLayerIds && !src.vectorLayerIds.includes("poi")) return;
      const rank: ExpressionSpecification = ["coalesce", ["get", "rank"], 30];
      map.addLayer({
        id: "poi-labels",
        type: "symbol",
        source: sourceId,
        "source-layer": "poi",
        minzoom: 14,
        filter: [
          "all",
          // 駅・バス停・出入口などは自前で描くか不要なので除外
          ["!", ["in", ["get", "class"], ["literal", ["railway", "bus", "entrance", "subway", "tram_stop", "ferry_terminal"]]]],
          ["has", "name"],
          // ズームが浅いうちは重要度の高いものだけ
          ["case", ["<", ["zoom"], 15], ["<=", rank, 5], ["<", ["zoom"], 16], ["<=", rank, 15], true],
        ],
        layout: {
          "text-field": ["coalesce", ["get", "name:ja"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 14, 10, 17, 12],
          "text-max-width": 8,
          "text-anchor": "top",
          "text-offset": [0, 0.4],
          "text-padding": 6,
          "text-optional": true,
          "symbol-sort-key": rank,
        },
        paint: {
          "text-color": "#6b7280",
          "text-halo-color": "rgba(255,255,255,0.9)",
          "text-halo-width": 1.5,
        },
      });
      map.addLayer(
        {
          id: "poi-dots",
          type: "circle",
          source: sourceId,
          "source-layer": "poi",
          minzoom: 15,
          filter: map.getFilter("poi-labels") ?? ["literal", true],
          paint: { "circle-radius": 2, "circle-color": "#9ca3af", "circle-opacity": 0.8 },
        },
        "poi-labels",
      );
    };
    addIfPossible();
    // タイルの TileJSON がまだ来ていなければ、来てから追加する
    map.on("sourcedata", (e) => {
      if (e.sourceId === sourceId && e.isSourceLoaded) addIfPossible();
    });
  }

  // ---- フォーカスをスタイルに反映 ----
  /** フォーカス中の路線 ID。駅をフォーカスしたときはその駅を通る路線 */
  function highlightedLines(sel: Selection): string[] {
    const f = sel.focus;
    if (!f) return [];
    if (f.kind === "line") return [f.id];
    return data.stationById.get(f.id)?.properties.lines ?? [];
  }

  function applySelection(sel: Selection): void {
    if (!map.getLayer(L_LINE)) return;
    const hi = highlightedLines(sel);
    const hasHi = hi.length > 0;

    const lineIsHi: ExpressionSpecification = hasHi ? ["in", ["get", "id"], ["literal", hi]] : ["literal", false];
    const focusW: ExpressionSpecification = ["case", lineIsHi, LINE_FOCUS_WIDTH, 1];
    const lineOpacity: ExpressionSpecification = ["case", lineIsHi, 1, LINE_DEFAULT_OPACITY];
    const sortKey: ExpressionSpecification = ["case", lineIsHi, 1, 0];

    map.setPaintProperty(L_CASING, "line-width", lineW(2.5, 6, 13, focusW));
    map.setPaintProperty(L_LINE, "line-width", lineW(1.2, 3.2, 8, focusW));
    map.setPaintProperty(L_CASING, "line-opacity", lineOpacity);
    map.setPaintProperty(L_LINE, "line-opacity", lineOpacity);
    map.setLayoutProperty(L_CASING, "line-sort-key", sortKey);
    map.setLayoutProperty(L_LINE, "line-sort-key", sortKey);
    // 路線名ラベルは、フォーカス中はその路線だけ。太い線の上に乗るので白文字＋路線色の縁取りにする
    map.setFilter(L_LABEL, hasHi ? lineIsHi : ["literal", true]);
    map.setPaintProperty(L_LABEL, "text-color", ["case", lineIsHi, "#ffffff", ["get", "color"]]);
    map.setPaintProperty(L_LABEL, "text-halo-color", ["case", lineIsHi, ["get", "color"], "#ffffff"]);

    const stIsHi: ExpressionSpecification = hasHi
      ? ["any", ...hi.map((id): ExpressionSpecification => ["in", id, ["get", "lines"]])]
      : ["literal", false];
    map.setPaintProperty(L_STATION, "circle-opacity", ["case", stIsHi, 1, STATION_DEFAULT_OPACITY]);
    map.setPaintProperty(L_STATION, "circle-stroke-opacity", ["case", stIsHi, 1, STATION_DEFAULT_OPACITY]);

    // 駅名ラベル: フォーカス中はその路線の全駅、通常時は 13 未満で乗換駅のみ
    const labelFilter: FilterSpecification = hasHi
      ? stIsHi
      : ["any", [">=", ["zoom"], 13], [">", ["get", "lineCount"], 1]];
    map.setFilter(L_STATION_LABEL, labelFilter);

    const stationId = sel.focus?.kind === "station" ? sel.focus.id : "";
    map.setFilter(L_STATION_SELECTED, ["==", ["get", "id"], stationId]);
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
        state.focusStation(id);
        return;
      }
      // 路線: タップ位置に重なっている路線を全部吹き出しに出し、先頭を選択状態にする
      const lineIds = [...new Set(feats.filter((f) => f.layer.id === L_HIT).map((f) => String(f.properties["id"])))];
      if (lineIds.length > 0) {
        state.focusLine(lineIds[0]!);
        openLinePopup(e.lngLat, lineIds);
        return;
      }
      popup?.remove();
    });
  }

  /** 路線ボタン。クリックで選択してその路線全体にフィット */
  function lineButton(lid: string): HTMLButtonElement | null {
    const line = data.lineById.get(lid);
    if (!line) return null;
    const btn = document.createElement("button");
    btn.className = "popup-line";
    btn.type = "button";
    btn.title = "この路線の全体を表示";
    btn.innerHTML = `<span class="dot"></span><span class="name"><span class="op-prefix"></span></span>`;
    (btn.children[0] as HTMLElement).style.background = line.properties.color;
    const name = btn.children[1]!;
    name.children[0]!.textContent = line.properties.operatorShort;
    name.append(line.properties.shortName);
    btn.addEventListener("click", () => {
      state.focusLine(lid);
      focusLine(lid);
    });
    return btn;
  }

  function openLinePopup(lngLat: { lng: number; lat: number }, lineIds: string[]): void {
    popup?.remove();
    const el = document.createElement("div");
    for (const lid of lineIds) {
      const btn = lineButton(lid);
      if (btn) el.appendChild(btn);
    }
    popup = new Popup({ offset: 10, closeButton: false, maxWidth: "280px" }).setLngLat(lngLat).setDOMContent(el).addTo(map);
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
      const btn = lineButton(lid);
      if (btn) el.appendChild(btn);
    }
    popup = new Popup({ offset: 12, closeButton: false, maxWidth: "280px" })
      .setLngLat(st.geometry.coordinates as [number, number])
      .setDOMContent(el)
      .addTo(map);
  }

  function focusLine(id: string): void {
    const f: LineFeature | undefined = data.lineById.get(id);
    if (!f) return;
    // 上のワードマーク・右下の FAB・左下のボタンに被らない余白を取る
    map.fitBounds(f.properties.bbox as LngLatBoundsLike, {
      padding: { top: 70, bottom: 90, left: 48, right: 48 },
      duration: 700,
      maxZoom: 14,
    });
  }

  function focusStation(id: string): void {
    const f: StationFeature | undefined = data.stationById.get(id);
    if (!f) return;
    // ポップアップが上に出るぶん、駅を少し下寄りに置く
    map.flyTo({
      center: f.geometry.coordinates as [number, number],
      zoom: Math.max(map.getZoom(), 14),
      offset: [0, 40],
      duration: 700,
    });
    openStationPopup(id);
  }

  function resetView(): void {
    popup?.remove();
    state.clear();
    map.fitBounds(data.bbox as LngLatBoundsLike, { padding: 40, duration: 700, bearing: 0, pitch: 0 });
  }

  return { map, focusLine, focusStation, resetView };
}
