import { defineConfig } from "vite";

export default defineConfig({
  // 相対パスにしておくと GitHub Pages のサブパス配信でもそのまま動く
  base: "./",
  // maplibre-gl 本体が 1MB 弱あるので警告閾値を上げておく
  build: { target: "es2022", chunkSizeWarningLimit: 1300 },
  test: { include: ["tests/**/*.test.ts"] },
});
