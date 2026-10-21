/** 運営会社の表示用短縮名 */
const OPERATOR_SHORT: Record<string, string> = {
  東日本旅客鉄道: "JR東日本",
  西日本旅客鉄道: "JR西日本",
  東海旅客鉄道: "JR東海",
  北海道旅客鉄道: "JR北海道",
  九州旅客鉄道: "JR九州",
  四国旅客鉄道: "JR四国",
  東京地下鉄: "東京メトロ",
  東京都: "都営",
  大阪市高速電気軌道: "Osaka Metro",
  横浜市: "横浜市営",
  名古屋市: "名古屋市営",
  札幌市: "札幌市営",
  京都市: "京都市営",
  神戸市: "神戸市営",
  仙台市: "仙台市営",
  福岡市: "福岡市営",
  東京急行電鉄: "東急",
  京浜急行電鉄: "京急",
};

export function shortOperator(operator: string): string {
  return OPERATOR_SHORT[operator] ?? operator;
}

/** "4号線丸ノ内線" → "丸ノ内線"。地下鉄の番号接頭辞を落として表示名を作る */
export function shortLineName(name: string): string {
  return name.replace(/^\d+号線(?=.)/, "");
}

/** N02_001 鉄道区分コード */
export const RAIL_TYPE: Record<string, string> = {
  "11": "普通鉄道JR",
  "12": "普通鉄道",
  "13": "鋼索鉄道",
  "14": "懸垂式鉄道",
  "15": "跨座式鉄道",
  "16": "案内軌条式鉄道",
  "17": "無軌条電車",
  "21": "軌道",
  "22": "懸垂式モノレール",
  "23": "跨座式モノレール",
  "24": "案内軌条式",
  "25": "浮上式",
};

/** N02_002 事業者種別コード */
export const OPERATOR_TYPE: Record<string, string> = {
  "1": "JR新幹線",
  "2": "JR在来線",
  "3": "公営鉄道",
  "4": "民営鉄道",
  "5": "第三セクター",
};
