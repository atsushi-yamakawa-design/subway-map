/**
 * 国土数値情報 鉄道データ (N02) をダウンロードして data/raw/ に GeoJSON を展開する。
 *
 *   npm run data:download            # 最新年度から順に試す
 *   N02_URL=https://... npm run data:download   # URL を直接指定
 *
 * 配布元: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html
 * 利用には国土数値情報の利用規約が適用される。
 */
import { execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const RAW_DIR = "data/raw";
const ZIP_PATH = join(RAW_DIR, "N02.zip");
const EXTRACT_DIR = join(RAW_DIR, "extract");

function candidateUrls(): string[] {
  if (process.env.N02_URL) return [process.env.N02_URL];
  const urls: string[] = [];
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= thisYear - 4; y--) {
    const yy = String(y).slice(2);
    urls.push(`https://nlftp.mlit.go.jp/ksj/gml/data/N02/N02-${yy}/N02-${yy}_GML.zip`);
    urls.push(`https://nlftp.mlit.go.jp/ksj/gml/data/N02/N02-${y}/N02-${yy}_GML.zip`);
  }
  return urls;
}

async function download(url: string): Promise<boolean> {
  console.log(`GET ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "subway-map data pipeline (+https://github.com/atsushi-yamakawa-design/subway-map)" },
    redirect: "follow",
  });
  if (!res.ok || !res.body) {
    console.log(`  -> ${res.status}`);
    return false;
  }
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("text/html")) {
    console.log("  -> HTML が返ってきた（規約ページ？）。スキップ");
    return false;
  }
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(ZIP_PATH));
  const size = (await stat(ZIP_PATH)).size;
  console.log(`  -> ${(size / 1e6).toFixed(1)} MB`);
  return size > 1e6;
}

async function findFiles(dir: string, pattern: RegExp, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await findFiles(p, pattern, out);
    else if (pattern.test(entry.name)) out.push(p);
  }
  return out;
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  let ok = false;
  for (const url of candidateUrls()) {
    try {
      if (await download(url)) {
        ok = true;
        break;
      }
    } catch (e) {
      console.log(`  -> failed: ${(e as Error).message}`);
    }
  }
  if (!ok) {
    console.error("N02 のダウンロードに失敗。ブラウザで配布ページから zip を落として N02_URL=file パスではなく data/raw/N02.zip に置き、再実行してください。");
    process.exit(1);
  }

  await rm(EXTRACT_DIR, { recursive: true, force: true });
  await mkdir(EXTRACT_DIR, { recursive: true });
  execFileSync("unzip", ["-o", "-q", ZIP_PATH, "-d", EXTRACT_DIR], { stdio: "inherit" });

  const rail = pickUtf8(await findFiles(EXTRACT_DIR, /RailroadSection.*\.geojson$/i));
  const station = pickUtf8(await findFiles(EXTRACT_DIR, /Station.*\.geojson$/i));
  if (!rail || !station) {
    console.error("zip 内に RailroadSection / Station の GeoJSON が見つかりません。");
    console.error((await findFiles(EXTRACT_DIR, /./)).join("\n"));
    process.exit(1);
  }
  await copyFile(rail, join(RAW_DIR, "railroad.geojson"));
  await copyFile(station, join(RAW_DIR, "station.geojson"));
  console.log(`railroad: ${rail}\nstation:  ${station}`);
}

/** utf8 ディレクトリ配下があればそちらを優先 */
function pickUtf8(files: string[]): string | undefined {
  return files.find((f) => /utf-?8/i.test(f)) ?? files[0];
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
