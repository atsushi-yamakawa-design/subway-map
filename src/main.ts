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

  // スマホでは項目を選ぶとパネルを閉じる。地図はパネルが閉じ終わってから広い面積で位置合わせする。
  const isMobile = () => window.innerWidth <= 720;
  function afterPanelSettled(fn: () => void): void {
    if (!isMobile() || sidebar.classList.contains("collapsed")) {
      fn();
      return;
    }
    setSidebarOpen(false);
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      sidebar.removeEventListener("transitionend", onEnd);
      rail.map.resize();
      fn();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target === sidebar) run();
    };
    sidebar.addEventListener("transitionend", onEnd);
    window.setTimeout(run, 400); // transitionend が来ない環境（reduced motion など）の保険
  }

  const sidebarApi = createSidebar(data, state, {
    onLine(id) {
      state.focusLine(id);
      afterPanelSettled(() => rail.focusLine(id));
    },
    onStation(id) {
      state.focusStation(id);
      afterPanelSettled(() => rail.focusStation(id));
    },
  });

  document.getElementById("reset")!.addEventListener("click", () => {
    sidebarApi.clearQuery();
    rail.resetView();
  });

  // URL に選択が入っていたら最初からそこへ寄せる
  rail.map.once("load", () => {
    const f = state.get().focus;
    if (f?.kind === "station") rail.focusStation(f.id);
    else if (f?.kind === "line") rail.focusLine(f.id);
  });
}

void boot();
