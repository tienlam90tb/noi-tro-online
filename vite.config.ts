/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-180.png"],
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png}"] },
      manifest: {
        name: "Nội trợ online",
        short_name: "Nội trợ",
        description: "Thử xem bạn đảm đang tới đâu: đi chợ, rửa bát, nấu cơm, phơi đồ.",
        lang: "vi",
        start_url: "./",
        display: "standalone",
        orientation: "portrait",
        background_color: "#fff7ed",
        theme_color: "#f97316",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  test: { include: ["src/**/*.test.ts"] },
});
