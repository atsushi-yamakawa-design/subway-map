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
  相模鉄道: "相鉄",
  首都圏新都市鉄道: "つくばエクスプレス",
  東京臨海高速鉄道: "りんかい線",
  横浜高速鉄道: "みなとみらい線",
  埼玉新都市交通: "ニューシャトル",
  舞浜リゾートライン: "ディズニーリゾートライン",
  名古屋臨海高速鉄道: "あおなみ線",
  愛知高速交通: "リニモ",
  大阪港トランスポートシステム: "OTS",
  北大阪急行電鉄: "北大阪急行",
};

export function shortOperator(operator: string): string {
  return OPERATOR_SHORT[operator] ?? operator;
}

/** "4号線丸ノ内線" → "丸ノ内線"。地下鉄の番号接頭辞を落として表示名を作る */
export function shortLineName(name: string): string {
  return name.replace(/^\d+号線(?=.)/, "");
}

/**
 * 俗称・愛称。N02 の正式名称より一般に通っている呼び名を表示に使う。
 * 正式名称は検索キーに残るので「野田線」で探しても当たる。
 * 路線の一部区間だけの愛称（京浜東北線、JR京都線など）は誤解を招くので入れない。
 */
export interface AliasRule {
  operator: string; // 運営会社名に含まれる文字列
  line: string; // 正式路線名（完全一致）
  alias: string;
}

export const LINE_ALIASES: AliasRule[] = [
  { operator: "東武", line: "野田線", alias: "アーバンパークライン" },
  { operator: "東武", line: "東上本線", alias: "東上線" },
  { operator: "横浜市", line: "1号線", alias: "ブルーライン" },
  { operator: "横浜市", line: "3号線", alias: "ブルーライン" },
  { operator: "横浜市", line: "4号線", alias: "グリーンライン" },
  { operator: "首都圏新都市鉄道", line: "常磐新線", alias: "つくばエクスプレス" },
  { operator: "東京臨海高速鉄道", line: "臨海副都心線", alias: "りんかい線" },
  { operator: "ゆりかもめ", line: "東京臨海新交通臨海線", alias: "ゆりかもめ" },
  { operator: "横浜高速鉄道", line: "みなとみらい21線", alias: "みなとみらい線" },
  { operator: "埼玉新都市交通", line: "伊奈線", alias: "ニューシャトル" },
  { operator: "舞浜リゾートライン", line: "ディズニーリゾートライン", alias: "ディズニーリゾートライン" },
  { operator: "西武", line: "山口線", alias: "レオライナー" },
  { operator: "東京都", line: "荒川線", alias: "東京さくらトラム" },
  { operator: "千葉都市モノレール", line: "1号線", alias: "1号線" },
  { operator: "西日本旅客鉄道", line: "片町線", alias: "学研都市線" },
  { operator: "西日本旅客鉄道", line: "桜島線", alias: "JRゆめ咲線" },
  { operator: "西日本旅客鉄道", line: "東西線", alias: "JR東西線" },
  { operator: "大阪市高速電気軌道", line: "南港ポートタウン線", alias: "ニュートラム" },
  { operator: "名古屋臨海高速鉄道", line: "西名古屋港線", alias: "あおなみ線" },
  { operator: "愛知高速交通", line: "東部丘陵線", alias: "リニモ" },
  { operator: "神戸新交通", line: "ポートアイランド線", alias: "ポートライナー" },
  { operator: "神戸新交通", line: "六甲アイランド線", alias: "六甲ライナー" },
  { operator: "大阪モノレール", line: "大阪モノレール線", alias: "本線" },
];

export function lineAlias(operator: string, lineName: string): string | undefined {
  return LINE_ALIASES.find((r) => operator.includes(r.operator) && r.line === lineName)?.alias;
}

/**
 * 表示名の組み立て。事業者名を薄く前置きした「東急東横線」形式にするが、
 * 路線名が事業者名で始まる／同じ場合（相鉄本線、ゆりかもめ）は前置きしない。
 */
export function displayName(operator: string, lineName: string): { shortName: string; prefix: string } {
  const opShort = shortOperator(operator);
  const shortName = lineAlias(operator, lineName) ?? shortLineName(lineName);
  const prefix = shortName === opShort || shortName.startsWith(opShort) ? "" : opShort;
  return { shortName, prefix };
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
