import Fuse from "fuse.js";
import type { AppState, Selection } from "./state";
import type { MapData } from "./types";

interface Doc {
  kind: "line" | "station";
  id: string;
  title: string;
  sub: string;
  color: string;
  search: string[]; // 検索対象の文字列
}

export interface SidebarHandlers {
  onLine(id: string): void;
  onStation(id: string): void;
}

export function createSidebar(data: MapData, state: AppState, handlers: SidebarHandlers): void {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const input = $<HTMLInputElement>("search");
  const results = $<HTMLDivElement>("results");
  const chips = $<HTMLDivElement>("chips");
  const segButtons = [...document.querySelectorAll<HTMLButtonElement>(".seg-btn")];
  const regionLabel = $<HTMLSpanElement>("region-label");

  if (data.meta) regionLabel.textContent = data.meta.region;

  // ---- 検索インデックス ----
  const docs: Doc[] = [];
  for (const f of data.lines.features) {
    const p = f.properties;
    docs.push({
      kind: "line",
      id: p.id,
      title: p.shortName,
      sub: `${p.operatorShort} · ${p.stationCount}駅`,
      color: p.color,
      search: [p.shortName, p.name, p.operator, p.operatorShort],
    });
  }
  for (const f of data.stations.features) {
    const p = f.properties;
    const lineNames = p.lines
      .map((id) => data.lineById.get(id)?.properties.shortName)
      .filter((v): v is string => !!v);
    docs.push({
      kind: "station",
      id: p.id,
      title: p.name,
      sub: lineNames.join("・"),
      color: p.color,
      search: [p.name],
    });
  }
  const fuse = new Fuse(docs, {
    keys: [
      { name: "search", weight: 2 },
      { name: "sub", weight: 0.5 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });

  // ---- 種類の絞り込み（UI だけの状態。URL には入れない）----
  type Kind = "all" | "line" | "station";
  let kind: Kind = "all";
  for (const btn of segButtons) {
    btn.addEventListener("click", () => {
      kind = (btn.dataset["kind"] as Kind) ?? "all";
      for (const b of segButtons) b.setAttribute("aria-checked", String(b === btn));
      renderResults(state.get());
    });
  }

  // ---- 描画 ----
  function render(sel: Selection): void {
    renderChips(sel);
    renderResults(sel);
  }

  function renderChips(sel: Selection): void {
    chips.replaceChildren();
    for (const id of sel.lines) {
      const line = data.lineById.get(id);
      if (!line) continue;
      chips.appendChild(chip(line.properties.color, line.properties.shortName, () => state.removeLine(id)));
    }
    if (sel.station) {
      const st = data.stationById.get(sel.station);
      if (st) chips.appendChild(chip(null, `${st.properties.name}駅`, () => state.selectStation(null)));
    }
    if (chips.childElementCount > 0) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "link-btn";
      clear.textContent = "クリア";
      clear.addEventListener("click", () => state.clear());
      chips.appendChild(clear);
    }
  }

  function chip(color: string | null, text: string, onRemove: () => void): HTMLElement {
    const el = document.createElement("span");
    el.className = "chip";
    if (color) {
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = color;
      el.appendChild(dot);
    }
    el.append(text);
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
    const matchesKind = (d: Doc) => kind === "all" || d.kind === kind;
    if (q) {
      const hits = fuse.search(q, { limit: 60 }).map((r) => r.item).filter(matchesKind).slice(0, 40);
      if (hits.length === 0) {
        results.appendChild(empty("該当なし"));
        return;
      }
      for (const d of hits) results.appendChild(row(d, sel));
      return;
    }
    // クエリ無しで「駅」: 駅を五十音順ではなく名前順に一覧（かなが無いので文字コード順）
    if (kind === "station") {
      const frag = document.createDocumentFragment();
      for (const d of docs) if (d.kind === "station") frag.appendChild(row(d, sel));
      results.appendChild(frag);
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
    const selected = d.kind === "line" ? sel.lines.has(d.id) : sel.station === d.id;
    if (selected) btn.classList.add("selected");
    const sw = document.createElement("span");
    sw.className = "swatch" + (d.kind === "station" ? " station" : "");
    if (d.kind === "station") sw.style.borderColor = d.color;
    else sw.style.background = d.color;
    const main = document.createElement("span");
    main.className = "main";
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = d.title;
    const sub = document.createElement("span");
    sub.className = "sub";
    sub.textContent = d.sub;
    main.append(title, sub);
    const kind = document.createElement("span");
    kind.className = "kind";
    kind.textContent = d.kind === "line" ? "路線" : "駅";
    btn.append(sw, main, kind);
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
}
