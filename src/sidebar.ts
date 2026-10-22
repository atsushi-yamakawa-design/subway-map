import { Searcher, normalize, type Searchable } from "./search";
import type { AppState, Selection } from "./state";
import type { MapData } from "./types";

interface Doc extends Searchable {
  kind: "line" | "station";
  id: string;
  /** 路線なら薄く前置きする事業者名 */
  prefix?: string;
  title: string;
  sub: string;
  color: string;
}

export interface SidebarHandlers {
  onLine(id: string): void;
  onStation(id: string): void;
}

export interface Sidebar {
  clearQuery(): void;
}

export function createSidebar(data: MapData, state: AppState, handlers: SidebarHandlers): Sidebar {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const input = $<HTMLInputElement>("search");
  const results = $<HTMLDivElement>("results");
  const chips = $<HTMLDivElement>("chips");

  // ---- 検索インデックス ----
  const docs: Doc[] = [];
  const uniq = (arr: string[]) => [...new Set(arr.map(normalize).filter(Boolean))];
  // 「JR山手線」「メトロ銀座線」のような、さらに縮めた呼び方
  const brandOf = (operatorShort: string): string | undefined => {
    if (operatorShort.startsWith("JR")) return "JR";
    if (operatorShort.includes("メトロ")) return "メトロ";
    return undefined;
  };
  for (const f of data.lines.features) {
    const p = f.properties;
    const brand = brandOf(p.operatorShort);
    docs.push({
      kind: "line",
      id: p.id,
      prefix: p.prefix || undefined,
      title: p.shortName,
      sub: `${p.stationCount}駅`,
      color: p.color,
      // 「東横線」「東急東横線」「東急電鉄東横線」「東急」… どの呼び方でも当たるように
      keys: uniq([
        p.shortName,
        p.name,
        p.operatorShort + p.shortName,
        p.operator + p.shortName,
        p.operatorShort + p.name,
        p.operator + p.name,
        ...(brand ? [brand + p.shortName, brand + p.name] : []),
        p.operatorShort,
        p.operator,
      ]),
    });
  }
  for (const f of data.stations.features) {
    const p = f.properties;
    const lines = p.lines.map((id) => data.lineById.get(id)?.properties).filter((v) => !!v);
    const lineNames = lines.map((l) => l.shortName);
    docs.push({
      kind: "station",
      id: p.id,
      title: p.name,
      sub: lineNames.join("・"),
      color: p.color,
      // 「渋谷」「渋谷駅」「銀座線渋谷」「東急渋谷」
      keys: uniq([
        p.name,
        p.name + "駅",
        ...lines.map((l) => l.shortName + p.name),
        ...lines.map((l) => l.operatorShort + p.name),
        ...lines.map((l) => brandOf(l.operatorShort)).filter((b): b is string => !!b).map((b) => b + p.name),
      ]),
    });
  }
  const searcher = new Searcher(docs);

  // ---- 描画 ----
  function render(sel: Selection): void {
    renderChips(sel);
    renderResults(sel);
  }

  function renderChips(sel: Selection): void {
    chips.replaceChildren();
    const f = sel.focus;
    if (!f) return;
    if (f.kind === "line") {
      const line = data.lineById.get(f.id);
      if (line) {
        chips.appendChild(chip(line.properties.color, line.properties.shortName, () => state.clear(), line.properties.prefix));
      }
    } else {
      const st = data.stationById.get(f.id);
      if (st) chips.appendChild(chip(null, `${st.properties.name}駅`, () => state.clear()));
    }
  }

  function chip(color: string | null, text: string, onRemove: () => void, prefix?: string): HTMLElement {
    const el = document.createElement("span");
    el.className = "chip";
    if (color) {
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = color;
      el.appendChild(dot);
    }
    // flex の gap が前置き部分と名前の間に入らないよう、1 つのラベル要素にまとめる
    const label = document.createElement("span");
    if (prefix) {
      const pre = document.createElement("span");
      pre.className = "op-prefix";
      pre.textContent = prefix;
      label.appendChild(pre);
    }
    label.append(text);
    el.appendChild(label);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "×";
    btn.setAttribute("aria-label", `${text} を外す`);
    btn.addEventListener("click", onRemove);
    el.appendChild(btn);
    return el;
  }

  function renderResults(sel: Selection): void {
    const q = input.value.trim();
    results.replaceChildren();
    if (q) {
      const hits = searcher.search(q, 40);
      if (hits.length === 0) {
        results.appendChild(empty("該当なし"));
        return;
      }
      for (const d of hits) results.appendChild(row(d, sel));
      return;
    }
    // クエリ無し: 事業者ごとに路線一覧
    const byOp = new Map<string, Doc[]>();
    for (const d of docs) {
      if (d.kind !== "line") continue;
      const key = data.lineById.get(d.id)!.properties.operator;
      (byOp.get(key) ?? byOp.set(key, []).get(key)!).push(d);
    }
    const ops = data.operators.filter((o) => byOp.has(o.name));
    for (const op of ops) {
      const group = document.createElement("details");
      group.className = "group";
      group.open = ops.length <= 3;
      const summary = document.createElement("summary");
      summary.textContent = op.short;
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = `${op.lineCount}路線`;
      summary.appendChild(badge);
      group.appendChild(summary);
      for (const d of byOp.get(op.name)!) group.appendChild(row(d, sel));
      results.appendChild(group);
    }
    if (ops.length === 0) results.appendChild(empty("路線がありません"));
  }

  function row(d: Doc, sel: Selection): HTMLElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "row";
    btn.setAttribute("role", "option");
    const selected = sel.focus?.kind === d.kind && sel.focus.id === d.id;
    if (selected) btn.classList.add("selected");
    const sw = document.createElement("span");
    sw.className = "swatch" + (d.kind === "station" ? " station" : "");
    if (d.kind === "station") sw.style.borderColor = d.color;
    else sw.style.background = d.color;
    const main = document.createElement("span");
    main.className = "main";
    const title = document.createElement("span");
    title.className = "title";
    if (d.prefix) {
      const pre = document.createElement("span");
      pre.className = "op-prefix";
      pre.textContent = d.prefix;
      title.appendChild(pre);
    }
    title.append(d.title);
    const sub = document.createElement("span");
    sub.className = "sub";
    sub.textContent = d.sub;
    main.append(title, sub);
    btn.append(sw, main);
    btn.addEventListener("click", () => {
      if (d.kind === "line") handlers.onLine(d.id);
      else handlers.onStation(d.id);
    });
    return btn;
  }

  function empty(text: string): HTMLElement {
    const el = document.createElement("div");
    el.className = "empty";
    el.textContent = text;
    return el;
  }

  // ---- イベント ----
  input.addEventListener("input", () => renderResults(state.get()));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = results.querySelector<HTMLButtonElement>(".row");
      first?.click();
    } else if (e.key === "Escape") {
      input.value = "";
      renderResults(state.get());
    }
  });

  state.subscribe((sel) => render(sel));
  render(state.get());

  return {
    clearQuery() {
      input.value = "";
      renderResults(state.get());
    },
  };
}
