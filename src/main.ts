import "./style.css";
import { loadData } from "./data";
import { createMap } from "./map";
import { createSidebar } from "./sidebar";
import { AppState } from "./state";

const status = document.getElementById("status")!;
const sidebar = document.getElementById("sidebar")!;
const toggleSidebar = document.getElementById("toggle-sidebar")!;

function setSidebarOpen(open: boolean): void {
  sidebar.classList.toggle("collapsed", !open);
  toggleSidebar.setAttribute("aria-expanded", String(open));
  try {
    localStorage.setItem("sidebarOpen", open ? "1" : "0");
  } catch {
    /* プライベートモードなどで保存できなくても動作には影響しない */
  }
}
toggleSidebar.addEventListener("click", () => {
  const open = sidebar.classList.contains("collapsed");
  setSidebarOpen(open);
  if (open) {
    // 入力欄は 16px なのでフォーカスしても iOS が画面を拡大しない
    const input = document.getElementById("search") as HTMLInputElement | null;
    input?.focus({ preventScroll: true });
  }
});
try {
  if (localStorage.getItem("sidebarOpen") === "0") setSidebarOpen(false);
} catch {
  /* noop */
}

// スマホでソフトキーボードが出ると visualViewport だけ縮む。
// レイアウト全体をその高さに合わせることで、下パネルの入力欄がキーボードの上に乗る。
const vv = window.visualViewport;
if (vv) {
  const sync = () => {
    // ピンチズーム中（scale≠1）はキーボードではないので除外
    const keyboardOpen = vv.scale === 1 && vv.height < window.innerHeight * 0.8;
    document.documentElement.style.setProperty("--vvh", keyboardOpen ? `${Math.round(vv.height)}px` : "");
    document.documentElement.classList.toggle("keyboard", keyboardOpen);
    if (keyboardOpen) window.scrollTo(0, 0);
  };
  vv.addEventListener("resize", sync);
  vv.addEventListener("scroll", sync);
}

async function boot(): Promise<void> {
  let data;
  try {
    data = await loadData();
  } catch (e) {
    status.classList.add("error");
    status.textContent = `データを読み込めませんでした（${(e as Error).message}）。npm run data でデータを生成してください。`;
    return;
  }
  status.classList.add("hidden");

  const state = new AppState();
  const rail = createMap(document.getElementById("map")!, data, state);

  const sidebarApi = createSidebar(data, state, {
    onLine(id) {
      const wasSelected = state.get().lines.has(id);
      state.toggleLine(id);
      if (!wasSelected) rail.focusLine(id);
    },
    onStation(id) {
      state.selectStation(id);
      rail.focusStation(id);
      if (window.innerWidth <= 720) setSidebarOpen(false);
    },
  });

  document.getElementById("reset")!.addEventListener("click", () => {
    sidebarApi.clearQuery();
    rail.resetView();
  });

  // URL に選択が入っていたら最初からそこへ寄せる
  rail.map.once("load", () => {
    const sel = state.get();
    if (sel.station) rail.focusStation(sel.station);
    else if (sel.lines.size === 1) rail.focusLine([...sel.lines][0]!);
  });
}

void boot();
