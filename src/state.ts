/**
 * 選択状態。URL のハッシュと同期して共有できるようにする。
 *   #l=<lineId>,<lineId>&s=<stationId>&h=1
 */
export interface Selection {
  lines: Set<string>;
  station: string | null;
  hideOthers: boolean;
}

type Listener = (s: Selection, changed: Set<keyof Selection>) => void;

export class AppState {
  private sel: Selection = { lines: new Set(), station: null, hideOthers: false };
  private listeners: Listener[] = [];

  constructor() {
    this.readHash();
    window.addEventListener("hashchange", () => {
      this.readHash();
      this.emit(new Set(["lines", "station", "hideOthers"]));
    });
  }

  get(): Selection {
    return this.sel;
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn);
  }

  toggleLine(id: string): void {
    if (this.sel.lines.has(id)) this.sel.lines.delete(id);
    else this.sel.lines.add(id);
    this.commit(["lines"]);
  }

  selectOnlyLine(id: string): void {
    this.sel.lines = new Set([id]);
    this.sel.station = null;
    this.commit(["lines", "station"]);
  }

  removeLine(id: string): void {
    this.sel.lines.delete(id);
    this.commit(["lines"]);
  }

  selectStation(id: string | null): void {
    this.sel.station = id;
    this.commit(["station"]);
  }

  setHideOthers(v: boolean): void {
    this.sel.hideOthers = v;
    this.commit(["hideOthers"]);
  }

  clear(): void {
    this.sel.lines.clear();
    this.sel.station = null;
    this.commit(["lines", "station"]);
  }

  private commit(keys: Array<keyof Selection>): void {
    this.writeHash();
    this.emit(new Set(keys));
  }

  private emit(changed: Set<keyof Selection>): void {
    for (const fn of this.listeners) fn(this.sel, changed);
  }

  private readHash(): void {
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    const list = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
    this.sel = {
      lines: new Set(list("l")),
      station: params.get("s") || null,
      hideOthers: params.get("h") === "1",
    };
  }

  private writeHash(): void {
    const p = new URLSearchParams();
    if (this.sel.lines.size) p.set("l", [...this.sel.lines].join(","));
    if (this.sel.station) p.set("s", this.sel.station);
    if (this.sel.hideOthers) p.set("h", "1");
    const hash = p.toString();
    const url = hash ? `#${hash}` : location.pathname + location.search;
    history.replaceState(null, "", url);
  }
}
