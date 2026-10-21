# subway-map

実際の地理座標に忠実な、検索できるインタラクティブ路線図。

- データ: [国土数値情報 鉄道データ (N02)](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html) 国土交通省
- ベースマップ: [OpenFreeMap](https://openfreemap.org) Positron（© OpenStreetMap contributors）
- 描画: [MapLibre GL JS](https://maplibre.org/)
- 検索: [Fuse.js](https://www.fusejs.io/)

## できること

- 路線名・駅名であいまい検索
- 路線を選ぶとその路線を強調（他路線は薄く表示、トグルで非表示にも）
- 駅をクリックすると通っている路線の一覧、そこから路線を選択
- 事業者で絞り込み
- URL のハッシュに選択状態が入るので、そのまま共有できる

## 開発

```sh
npm ci
npm run data        # N02 をダウンロードして public/data/ を生成（REGION=kanto がデフォルト）
npm run dev
```

`REGION` で切り出し範囲を変えられる。

```sh
REGION=kansai npm run data:build   # kanto | kansai | nagoya | all | minLng,minLat,maxLng,maxLat
```

ダウンロードがうまくいかないときは配布ページから zip を手で落として `data/raw/N02.zip` に置き、
もう一度 `npm run data:download` を実行する（zip があれば再利用される）。

```sh
npm run typecheck
npm test
npm run build
```

## デプロイ

`main` への push で GitHub Actions が N02 をダウンロードし、データ生成・ビルド・GitHub Pages への配信まで行う。
`workflow_dispatch` から `region` を指定して全国版などを作り直すこともできる。

初回だけ、リポジトリの Settings → Pages → Build and deployment → Source を **GitHub Actions** にしておく必要がある
（Actions のトークンでは Pages サイトを作成できないため）。

## 路線カラー

N02 には色情報が無いので `scripts/lib/colors.ts` に手で持っている。
当たらない路線はパレットから自動で割り当てられる。追加や修正は PR で。

## 設計メモ

[docs/architecture.md](docs/architecture.md) に技術選定の経緯をまとめている。
