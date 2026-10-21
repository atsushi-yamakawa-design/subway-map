import "./style.css";
import { loadData } from "./data";
import { createMap } from "./map";
import { createSidebar } from "./sidebar";
import { AppState } from "./state";

const status = document.getElementById("status")!;
const sidebar = document.getElementById("sidebar")!;
const toggleSidebar = document.getElementById("toggle-sidebar")!;

toggleSidebar.addEventListener("click", () => sidebar.classList.toggle("collapsed"));

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

  createSidebar(data, state, {
    onLine(id) {
      const wasSelected = state.get().lines.has(id);
      state.toggleLine(id);
      if (!wasSelected) rail.focusLine(id);
    },
    onStation(id) {
      state.selectStation(id);
      rail.focusStation(id);
      if (window.innerWidth <= 720) sidebar.classList.add("collapsed");
    },
  });

  // URL に選択が入っていたら最初からそこへ寄せる
  rail.map.once("load", () => {
    const sel = state.get();
    if (sel.station) rail.focusStation(sel.station);
    else if (sel.lines.size === 1) rail.focusLine([...sel.lines][0]!);
  });
}

void boot();
