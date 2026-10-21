import { describe, expect, it } from "vitest";
import { Searcher, normalize } from "../src/search.js";

const docs = [
  { id: "toyoko", keys: ["東横線", "東急東横線", "東急電鉄東横線", "東急"].map(normalize) },
  { id: "ginza", keys: ["銀座線", "3号線銀座線", "東京メトロ銀座線", "東京地下鉄銀座線", "東京メトロ"].map(normalize) },
  { id: "marunouchi", keys: ["丸ノ内線", "東京メトロ丸ノ内線"].map(normalize) },
  { id: "yamanote", keys: ["山手線", "jr東日本山手線", "東日本旅客鉄道山手線", "jr山手線"].map(normalize) },
  { id: "shibuya-st", keys: ["渋谷", "渋谷駅", "東横線渋谷", "銀座線渋谷", "東急渋谷"].map(normalize) },
  { id: "ichigaya-st", keys: ["市ヶ谷", "市ヶ谷駅"].map(normalize) },
];
const s = new Searcher(docs);
const ids = (q: string) => s.search(q, 10).map((d: { id: string }) => d.id);

describe("Searcher", () => {
  it("事業者名つきでも路線が当たる", () => {
    expect(ids("東急東横線")[0]).toBe("toyoko");
    expect(ids("東急電鉄東横線")[0]).toBe("toyoko");
    expect(ids("メトロ銀座線")[0]).toBe("ginza");
  });
  it("空白区切りは AND", () => {
    expect(ids("東急 東横")[0]).toBe("toyoko");
    expect(ids("銀座線 渋谷")).toEqual(["shibuya-st"]);
  });
  it("完全一致 > 前方一致 > 部分一致 の順", () => {
    expect(ids("東横線")[0]).toBe("toyoko");
    expect(ids("渋谷")[0]).toBe("shibuya-st");
    expect(ids("東急")[0]).toBe("toyoko"); // 「東急」そのものが東急渋谷より上
  });
  it("表記揺れを吸収する", () => {
    expect(ids("丸の内線")[0]).toBe("marunouchi");
    expect(ids("市ケ谷")[0]).toBe("ichigaya-st");
    expect(ids("ＪＲ山手線")[0]).toBe("yamanote");
    expect(ids("jr 山手")[0]).toBe("yamanote");
  });
  it("部分一致が無いときはあいまい一致に落ちる", () => {
    expect(ids("東急東横")).toContain("toyoko");
    expect(ids("銀坐線")[0]).toBe("ginza"); // 1 文字違い
    expect(ids("東京メト口銀座線")[0]).toBe("ginza"); // 長いキーの中の誤字
    expect(ids("ああああ")).toEqual([]); // 無関係なものは出ない
  });
  it("空クエリは空", () => {
    expect(ids("   ")).toEqual([]);
  });
});
