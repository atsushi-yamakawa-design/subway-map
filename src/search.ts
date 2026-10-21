/**
 * 検索用の正規化。全角/半角、大文字小文字、空白、「ノ/の」「ヶ/ケ」などの表記揺れを吸収する。
 *   "東急 東横線" → "東急東横線"、"丸の内線" → "丸ノ内線"、"市ケ谷" → "市ヶ谷"
 */
export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・･‐－-]/g, "")
    .replace(/の/g, "ノ")
    .replace(/ケ/g, "ヶ")
    .replace(/ヵ/g, "ヶ")
    .replace(/ヱ/g, "エ")
    .replace(/ヰ/g, "イ");
}

export interface Searchable {
  /** 正規化済みの検索キー。先頭ほど「本名」に近い */
  keys: string[];
}

/**
 * 部分一致を主、あいまい一致を補助にした検索。
 * - クエリは空白で分けて AND（「東急 東横」でも「東急東横線」でも当たる）
 * - 並びは 完全一致 > 前方一致 > 部分一致、同点なら短いキーを優先
 * - 部分一致が 0 件のときだけ編集距離でタイポ許容（4 文字以下は 1 文字、それ以上は 2 文字まで）
 */
export class Searcher<T extends Searchable> {
  constructor(private docs: T[]) {}

  search(query: string, limit: number): T[] {
    const tokens = query
      .normalize("NFKC")
      .split(/\s+/)
      .map(normalize)
      .filter(Boolean);
    if (tokens.length === 0) return [];
    const joined = tokens.join("");

    const scored: Array<{ doc: T; score: number }> = [];
    for (const doc of this.docs) {
      let best = Infinity;
      for (const key of doc.keys) {
        if (!tokens.every((t) => key.includes(t))) continue;
        let s: number;
        if (key === joined) s = 0;
        else if (key.startsWith(joined)) s = 1;
        else if (key.includes(joined)) s = 2;
        else s = 3; // トークンがばらばらに当たった
        s += key.length / 1000; // 同点なら短いキー（＝本名に近い）を上に
        if (s < best) best = s;
      }
      if (best < Infinity) scored.push({ doc, score: best });
    }
    if (scored.length > 0) {
      scored.sort((a, b) => a.score - b.score);
      return scored.slice(0, limit).map((s) => s.doc);
    }
    return this.fuzzy(joined, limit);
  }

  private fuzzy(q: string, limit: number): T[] {
    if (q.length < 2) return [];
    const maxDist = q.length <= 4 ? 1 : 2;
    const scored: Array<{ doc: T; score: number }> = [];
    for (const doc of this.docs) {
      let best = Infinity;
      for (const key of doc.keys) {
        const score = windowDistance(q, key, maxDist) + key.length / 1000;
        if (score < best) best = score;
      }
      if (best <= maxDist + 1) scored.push({ doc, score: best });
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, limit).map((s) => s.doc);
  }
}

/**
 * q と、key の中の q と同じ長さ（±1）の部分文字列との最小編集距離。
 * 「銀坐線」→「銀座線」のような 1 文字違いや、長いキーの中の誤字を拾う。
 */
function windowDistance(q: string, key: string, maxDist: number): number {
  const ql = q.length;
  let best = Infinity;
  for (const w of [ql, ql + 1, ql - 1]) {
    if (w <= 0) continue;
    for (let i = 0; i + w <= key.length; i++) {
      const d = levenshtein(q, key.slice(i, i + w), maxDist);
      if (d < best) best = d;
      if (best === 0) return 0;
    }
  }
  return best;
}

function levenshtein(a: string, b: string, cutoff: number): number {
  if (Math.abs(a.length - b.length) > cutoff) return cutoff + 1;
  let prev = new Array<number>(b.length + 1);
  let cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (cur[j]! < rowMin) rowMin = cur[j]!;
    }
    if (rowMin > cutoff) return cutoff + 1;
    [prev, cur] = [cur, prev];
  }
  return prev[b.length]!;
}
