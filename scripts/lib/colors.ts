/**
 * 路線カラーの手動テーブル。
 * N02 には色情報が無いので、運営会社名・路線名の部分一致で割り当てる。
 * 先に書いたものが優先されるので、具体的なものを上に置く。
 * 当たらなかったものは hash ベースのパレットにフォールバック。
 */
export interface ColorRule {
  /** 運営会社名に含まれる文字列。省略時は会社を問わない */
  operator?: string;
  /** 路線名に含まれる文字列。空文字なら会社全体のデフォルト */
  line: string;
  color: string;
}

export const COLOR_RULES: ColorRule[] = [
  // ---- 東京メトロ ----
  { operator: "東京地下鉄", line: "銀座線", color: "#FF9500" },
  { operator: "東京地下鉄", line: "丸ノ内線", color: "#F62E36" },
  { operator: "東京地下鉄", line: "日比谷線", color: "#B5B5AC" },
  { operator: "東京地下鉄", line: "東西線", color: "#009BBF" },
  { operator: "東京地下鉄", line: "千代田線", color: "#00BB85" },
  { operator: "東京地下鉄", line: "有楽町線", color: "#C1A470" },
  { operator: "東京地下鉄", line: "半蔵門線", color: "#8F76D6" },
  { operator: "東京地下鉄", line: "南北線", color: "#00AC9B" },
  { operator: "東京地下鉄", line: "副都心線", color: "#9C5E31" },
  // ---- 都営 ----
  { operator: "東京都", line: "浅草線", color: "#EC6E65" },
  { operator: "東京都", line: "三田線", color: "#006EBC" },
  { operator: "東京都", line: "新宿線", color: "#B0BF1E" },
  { operator: "東京都", line: "大江戸線", color: "#CE045B" },
  { operator: "東京都", line: "荒川線", color: "#E36A7E" },
  { operator: "東京都", line: "日暮里", color: "#D4A017" },
  // ---- JR東日本（首都圏）----
  { operator: "東日本旅客鉄道", line: "山手線", color: "#80C241" },
  { operator: "東日本旅客鉄道", line: "中央線", color: "#F15A22" },
  { operator: "東日本旅客鉄道", line: "青梅線", color: "#F15A22" },
  { operator: "東日本旅客鉄道", line: "五日市線", color: "#F15A22" },
  { operator: "東日本旅客鉄道", line: "総武線", color: "#FFD400" },
  { operator: "東日本旅客鉄道", line: "南武線", color: "#FFD400" },
  { operator: "東日本旅客鉄道", line: "鶴見線", color: "#FFD400" },
  { operator: "東日本旅客鉄道", line: "東北線", color: "#00B2E5" },
  { operator: "東日本旅客鉄道", line: "根岸線", color: "#00B2E5" },
  { operator: "東日本旅客鉄道", line: "東海道線", color: "#F68B1E" },
  { operator: "東日本旅客鉄道", line: "高崎線", color: "#F68B1E" },
  { operator: "東日本旅客鉄道", line: "横須賀線", color: "#0067C0" },
  { operator: "東日本旅客鉄道", line: "武蔵野線", color: "#F15A22" },
  { operator: "東日本旅客鉄道", line: "京葉線", color: "#C9252F" },
  { operator: "東日本旅客鉄道", line: "常磐線", color: "#00B261" },
  { operator: "東日本旅客鉄道", line: "赤羽線", color: "#00AC9A" },
  { operator: "東日本旅客鉄道", line: "川越線", color: "#00AC9A" },
  { operator: "東日本旅客鉄道", line: "横浜線", color: "#7FC241" },
  { operator: "東日本旅客鉄道", line: "相模線", color: "#009793" },
  { operator: "東日本旅客鉄道", line: "八高線", color: "#96A1A6" },
  { operator: "東日本旅客鉄道", line: "内房線", color: "#00B2E5" },
  { operator: "東日本旅客鉄道", line: "外房線", color: "#DC143C" },
  { operator: "東日本旅客鉄道", line: "成田線", color: "#00B261" },
  { operator: "東日本旅客鉄道", line: "東北新幹線", color: "#0C8B4A" },
  { operator: "東日本旅客鉄道", line: "上越新幹線", color: "#E5007F" },
  { operator: "東日本旅客鉄道", line: "北陸新幹線", color: "#1F3A93" },
  // ---- JR東海・西日本 ----
  { operator: "東海旅客鉄道", line: "新幹線", color: "#1D4F91" },
  { operator: "西日本旅客鉄道", line: "新幹線", color: "#0072BC" },
  { operator: "西日本旅客鉄道", line: "大阪環状線", color: "#E52B22" },
  { operator: "西日本旅客鉄道", line: "阪和線", color: "#F68B1E" },
  { operator: "西日本旅客鉄道", line: "関西線", color: "#3B9A4C" },
  { operator: "西日本旅客鉄道", line: "東海道線", color: "#0072BA" },
  { operator: "西日本旅客鉄道", line: "山陽線", color: "#0072BA" },
  // ---- 首都圏私鉄 ----
  { operator: "東急", line: "東横線", color: "#DA0442" },
  { operator: "東急", line: "目黒線", color: "#009CD2" },
  { operator: "東急", line: "田園都市線", color: "#20A288" },
  { operator: "東急", line: "大井町線", color: "#F18C43" },
  { operator: "東急", line: "池上線", color: "#EE86A7" },
  { operator: "東急", line: "多摩川線", color: "#AE0378" },
  { operator: "東急", line: "世田谷線", color: "#FCC70D" },
  { operator: "東急", line: "こどもの国線", color: "#0068B7" },
  { operator: "東京急行", line: "東横線", color: "#DA0442" },
  { operator: "東京急行", line: "目黒線", color: "#009CD2" },
  { operator: "東京急行", line: "田園都市線", color: "#20A288" },
  { operator: "東京急行", line: "大井町線", color: "#F18C43" },
  { operator: "東京急行", line: "池上線", color: "#EE86A7" },
  { operator: "小田急", line: "", color: "#2288CC" },
  { operator: "京王", line: "井の頭線", color: "#0E5EA6" },
  { operator: "京王", line: "", color: "#DD0077" },
  { operator: "西武", line: "池袋線", color: "#F7931E" },
  { operator: "西武", line: "新宿線", color: "#0066CC" },
  { operator: "西武", line: "", color: "#0066CC" },
  { operator: "東武", line: "東上", color: "#0C4DA2" },
  { operator: "東武", line: "野田線", color: "#0094B9" },
  { operator: "東武", line: "", color: "#E60012" },
  { operator: "京成", line: "", color: "#005AAA" },
  { operator: "京浜急行", line: "", color: "#0096E0" },
  { operator: "相模鉄道", line: "", color: "#0A2896" },
  { operator: "東京臨海高速鉄道", line: "", color: "#00418E" },
  { operator: "首都圏新都市鉄道", line: "", color: "#0033A0" },
  { operator: "東京モノレール", line: "", color: "#0070B7" },
  { operator: "ゆりかもめ", line: "", color: "#0063C4" },
  { operator: "北総鉄道", line: "", color: "#00A0E9" },
  { operator: "新京成", line: "", color: "#E85298" },
  { operator: "埼玉高速鉄道", line: "", color: "#0F4C81" },
  { operator: "横浜市", line: "1号線", color: "#0B52A1" },
  { operator: "横浜市", line: "3号線", color: "#0B52A1" },
  { operator: "横浜市", line: "4号線", color: "#00AC69" },
  { operator: "横浜高速鉄道", line: "", color: "#004098" },
  // ---- 関西 ----
  { operator: "大阪市高速電気軌道", line: "御堂筋線", color: "#E5171F" },
  { operator: "大阪市高速電気軌道", line: "谷町線", color: "#522886" },
  { operator: "大阪市高速電気軌道", line: "四つ橋線", color: "#0078BA" },
  { operator: "大阪市高速電気軌道", line: "中央線", color: "#019A66" },
  { operator: "大阪市高速電気軌道", line: "千日前線", color: "#E44D93" },
  { operator: "大阪市高速電気軌道", line: "堺筋線", color: "#814721" },
  { operator: "大阪市高速電気軌道", line: "長堀鶴見緑地線", color: "#A9CC51" },
  { operator: "大阪市高速電気軌道", line: "今里筋線", color: "#EE7B1A" },
  { operator: "大阪市高速電気軌道", line: "南港", color: "#00A0DE" },
  { operator: "阪急", line: "", color: "#7A1F2E" },
  { operator: "阪神", line: "", color: "#0075C2" },
  { operator: "京阪", line: "", color: "#008C3F" },
  { operator: "近畿日本鉄道", line: "", color: "#D22F31" },
  { operator: "南海", line: "", color: "#0A61A4" },
  { operator: "神戸市", line: "海岸線", color: "#0068B7" },
  { operator: "神戸市", line: "", color: "#008C6A" },
  { operator: "京都市", line: "烏丸線", color: "#00A24A" },
  { operator: "京都市", line: "東西線", color: "#DE4A31" },
  // ---- 名古屋 ----
  { operator: "名古屋市", line: "東山線", color: "#F2BE1C" },
  { operator: "名古屋市", line: "名城線", color: "#8F2E8B" },
  { operator: "名古屋市", line: "名港線", color: "#8F2E8B" },
  { operator: "名古屋市", line: "鶴舞線", color: "#0067C0" },
  { operator: "名古屋市", line: "桜通線", color: "#D2252A" },
  { operator: "名古屋市", line: "上飯田線", color: "#F2A4C3" },
  { operator: "名古屋鉄道", line: "", color: "#E60012" },
  // ---- 札幌・仙台・福岡 ----
  { operator: "札幌市", line: "南北線", color: "#008C50" },
  { operator: "札幌市", line: "東西線", color: "#EC6C00" },
  { operator: "札幌市", line: "東豊線", color: "#0074BE" },
  { operator: "仙台市", line: "南北線", color: "#00A95F" },
  { operator: "仙台市", line: "東西線", color: "#0072BC" },
  { operator: "福岡市", line: "空港線", color: "#ED6D1F" },
  { operator: "福岡市", line: "箕生線", color: "#0071BB" },
  { operator: "福岡市", line: "七隈線", color: "#53B332" },
  // ---- 汎用 ----
  { line: "新幹線", color: "#1F3A93" },
];

/** 色が当たらなかった路線用。淡色ベースマップ上で見分けがつく濃い色を揃えた。 */
export const FALLBACK_PALETTE = [
  "#1F77B4",
  "#D62728",
  "#2CA02C",
  "#9467BD",
  "#FF7F0E",
  "#8C564B",
  "#E377C2",
  "#17BECF",
  "#BCBD22",
  "#393B79",
  "#AD494A",
  "#637939",
];

export function lookupColor(operator: string, lineName: string): string | undefined {
  for (const rule of COLOR_RULES) {
    if (rule.operator && !operator.includes(rule.operator)) continue;
    if (rule.line && !lineName.includes(rule.line)) continue;
    return rule.color;
  }
  return undefined;
}

export function fallbackColor(hashSeed: number): string {
  return FALLBACK_PALETTE[Math.abs(hashSeed) % FALLBACK_PALETTE.length]!;
}
