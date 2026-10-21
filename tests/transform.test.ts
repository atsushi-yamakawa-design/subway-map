import { describe, expect, it } from "vitest";
import { buildData, lineId, type InFC } from "../scripts/lib/transform.js";
import { simplifyLine, lineMidpoint } from "../scripts/lib/geo.js";
import { lookupColor } from "../scripts/lib/colors.js";
import { shortLineName } from "../scripts/lib/names.js";

// 合成フィクスチャ。実データではなく、変換ロジックの確認用。
function section(operator: string, line: string, coords: number[][]) {
  return {
    type: "Feature" as const,
    geometry: { type: "LineString", coordinates: coords },
    properties: { N02_001: "12", N02_002: "3", N02_003: line, N02_004: operator },
  };
}
function station(operator: string, line: string, name: string, coords: number[][], group?: string) {
  return {
    type: "Feature" as const,
    geometry: { type: "LineString", coordinates: coords },
    properties: {
      N02_001: "12",
      N02_002: "3",
      N02_003: line,
      N02_004: operator,
      N02_005: name,
      N02_005c: name,
      ...(group ? { N02_005g: group } : {}),
    },
  };
}

const railroad: InFC = {
  type: "FeatureCollection",
  features: [
    section("東京地下鉄", "3号線銀座線", [[139.70, 35.66], [139.71, 35.665], [139.72, 35.67]]),
    section("東京地下鉄", "3号線銀座線", [[139.72, 35.67], [139.73, 35.675]]),
    section("東京都", "12号線大江戸線", [[139.70, 35.70], [139.71, 35.71]]),
    // 範囲外
    section("西日本旅客鉄道", "大阪環状線", [[135.50, 34.70], [135.51, 34.71]]),
  ],
};
const stations: InFC = {
  type: "FeatureCollection",
  features: [
    station("東京地下鉄", "3号線銀座線", "渋谷", [[139.700, 35.660], [139.701, 35.6605]], "G1"),
    station("東京都", "12号線大江戸線", "新宿", [[139.700, 35.700], [139.701, 35.7005]], "G2"),
    // 同じグループコードなら別会社でも 1 駅に名寄せされる
    station("東京地下鉄", "3号線銀座線", "新宿", [[139.7005, 35.7001], [139.7015, 35.7006]], "G2"),
    station("西日本旅客鉄道", "大阪環状線", "大阪", [[135.50, 34.70], [135.501, 34.7005]], "G9"),
  ],
};

describe("buildData", () => {
  const result = buildData(railroad, stations, { bbox: [139.0, 35.0, 140.5, 36.0], tolerance: 0 });

  it("路線を (運営会社, 路線名) でまとめ、範囲外の路線を落とす", () => {
    expect(result.lines.features.map((f) => f.properties.name)).toEqual(["3号線銀座線", "12号線大江戸線"]);
    const ginza = result.lines.features.find((f) => f.properties.name === "3号線銀座線")!;
    expect(ginza.geometry.coordinates).toHaveLength(2);
    expect(ginza.properties.shortName).toBe("銀座線");
    expect(ginza.properties.operatorShort).toBe("東京メトロ");
    expect(ginza.properties.color).toBe("#FF9500");
    expect(ginza.properties.bbox).toEqual([139.7, 35.66, 139.73, 35.675]);
    expect(ginza.properties.stationCount).toBe(2);
  });

  it("駅をグループコードで名寄せし、通る路線の一覧を持つ", () => {
    const names = result.stations.features.map((f) => f.properties.name);
    expect(names.sort()).toEqual(["新宿", "渋谷"].sort());
    const shinjuku = result.stations.features.find((f) => f.properties.name === "新宿")!;
    expect(shinjuku.properties.lineCount).toBe(2);
    expect(shinjuku.properties.lines).toContain(lineId("東京地下鉄", "3号線銀座線"));
    expect(shinjuku.properties.lines).toContain(lineId("東京都", "12号線大江戸線"));
    expect(shinjuku.properties.operators).toEqual(["東京地下鉄", "東京都"]);
    expect(shinjuku.geometry.coordinates[0]).toBeCloseTo(139.70075, 4);
  });

  it("stats に件数が入る", () => {
    expect(result.stats).toMatchObject({ sectionsIn: 4, sectionsKept: 3, lines: 2, stations: 2, colored: 2 });
  });

  it("bbox 無しなら全国分が残る", () => {
    const all = buildData(railroad, stations, { tolerance: 0 });
    expect(all.lines.features).toHaveLength(3);
    expect(all.stations.features).toHaveLength(3);
  });

  it("日本語キーの属性でも読める", () => {
    const jp: InFC = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [[139.7, 35.6], [139.71, 35.61]] },
          properties: { 鉄道区分: "12", 事業者種別: "4", 路線名: "東横線", 運営会社: "東急電鉄" },
        },
      ],
    };
    const r = buildData(jp, { type: "FeatureCollection", features: [] }, { tolerance: 0 });
    expect(r.lines.features[0]!.properties).toMatchObject({ name: "東横線", color: "#DA0442", operatorType: "民営鉄道" });
  });
});

describe("simplifyLine", () => {
  it("直線上の中間点を間引く", () => {
    const out = simplifyLine([[139.70, 35.60], [139.71, 35.60], [139.72, 35.60]], 0.0001);
    expect(out).toEqual([[139.70, 35.60], [139.72, 35.60]]);
  });
  it("曲がり角は残す", () => {
    const out = simplifyLine([[139.70, 35.60], [139.71, 35.61], [139.72, 35.60]], 0.0001);
    expect(out).toHaveLength(3);
  });
});

describe("helpers", () => {
  it("lineMidpoint は長さの中点を返す", () => {
    expect(lineMidpoint([[0, 0], [2, 0], [4, 0]])).toEqual([2, 0]);
    expect(lineMidpoint([[0, 0], [1, 0], [4, 0]])).toEqual([2, 0]);
  });
  it("色は会社で絞る（同名路線の衝突回避）", () => {
    expect(lookupColor("東京地下鉄", "5号線東西線")).toBe("#009BBF");
    expect(lookupColor("京都市", "東西線")).toBe("#DE4A31");
    expect(lookupColor("札幌市", "東西線")).toBe("#EC6C00");
    expect(lookupColor("謎の鉄道", "謎線")).toBeUndefined();
  });
  it("shortLineName は号線接頭辞だけ落とす", () => {
    expect(shortLineName("4号線丸ノ内線")).toBe("丸ノ内線");
    expect(shortLineName("山手線")).toBe("山手線");
    expect(shortLineName("1号線")).toBe("1号線");
  });
});
