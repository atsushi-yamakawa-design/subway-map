/**
 * フォーカス状態。常に 1 つだけ（路線か駅）。URL のハッシュと同期して共有できる。
 *   #l=<lineId>  または  #s=<stationId>
 */
export type Focus = { kind: "line"; id: string } | { kind: "station"; id: string };

export interface Selection {
  focus: Focus | null;
}

type Listener = (s: Selection) => void;

export class AppState {
  private sel: Selection = { focus: null };
  private listeners: Listener[] = [];

  constructor() {
    this.readHash();
    window.addEventListener("hashchange", () => {
      this.readHash();
      this.emit();
    });
  }

  get(): Selection {
    return this.sel;
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn);
  }

  focusLine(id: string): void {
    this.sel = { focus: { kind: "line", id } };
    this.commit();
  }

  focusStation(id: string): void {
    this.sel = { focus: { kind: "station", id } };
    this.commit();
  }

  clear(): void {
    this.sel = { focus: null };
    this.commit();
  }

  isFocused(kind: Focus["kind"], id: string): boolean {
    return this.sel.focus?.kind === kind && this.sel.focus.id === id;
  }

  private commit(): void {
    this.writeHash();
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.sel);
  }

  private readHash(): void {
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    const l = params.get("l");
    const s = params.get("s");
    this.sel = { focus: l ? { kind: "line", id: l } : s ? { kind: "station", id: s } : null };
  }

  private writeHash(): void {
    const p = new URLSearchParams();
    const f = this.sel.focus;
    if (f?.kind === "line") p.set("l", f.id);
    if (f?.kind === "station") p.set("s", f.id);
    const hash = p.toString();
    history.replaceState(null, "", hash ? `#${hash}` : location.pathname + location.search);
  }
}
