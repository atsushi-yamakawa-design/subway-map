/**
 * data/raw/*.geojson → public/data/{lines,stations}.geojson + meta.json
 *
 *   REGION=kanto npm run data:build          # kanto | kansai | nagoya | all | minLng,minLat,maxLng,maxLat
 *   SIMPLIFY_TOLERANCE=0.0001 npm run data:build
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildData, type InFC } from "./lib/transform.js";
import { resolveRegion } from "./lib/regions.js";

const RAW_DIR = "data/raw";
const OUT_DIR = "public/data";

async function main() {
  const region = resolveRegion(process.env.REGION);
  const tolerance = Number(process.env.SIMPLIFY_TOLERANCE ?? "0.0001");

  console.log(`region: ${region.label}  tolerance: ${tolerance}`);
  const railroad = JSON.parse(await readFile(join(RAW_DIR, "railroad.geojson"), "utf8")) as InFC;
  const station = JSON.parse(await readFile(join(RAW_DIR, "station.geojson"), "utf8")) as InFC;

  const result = buildData(railroad, station, { bbox: region.bbox, tolerance });

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "lines.geojson"), JSON.stringify(result.lines));
  await writeFile(join(OUT_DIR, "stations.geojson"), JSON.stringify(result.stations));
  await writeFile(
    join(OUT_DIR, "meta.json"),
    JSON.stringify(
      {
        region: region.label,
        bbox: region.bbox ?? null,
        generatedAt: new Date().toISOString(),
        source: "国土数値情報（鉄道データ）国土交通省 https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html",
        stats: result.stats,
      },
      null,
      2,
    ),
  );

  const s = result.stats;
  console.log(
    `sections ${s.sectionsKept}/${s.sectionsIn}  lines ${s.lines} (colored ${s.colored})  stations ${s.stations}`,
  );
  for (const f of result.lines.features) {
    const p = f.properties;
    console.log(`  ${p.color}  ${p.operatorShort.padEnd(10)} ${p.name}  (${p.stationCount}駅)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
