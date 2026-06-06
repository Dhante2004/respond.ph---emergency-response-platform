import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: [
          "logo-local.png",
          "icons/pwa-192x192.png",
          "icons/pwa-512x512.png",
          "icons/pwa-512x512-maskable.png",
          "screenshots/mobile.png",
          "screenshots/desktop-wide.png",
        ],
        manifest: {
          id: "/",
          name: "RESPOND.PH",
          short_name: "RESPOND.PH",
          description:
            "Tawi-Tawi's Unified Emergency Response and Disaster Management Platform.",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#0f172a",
          theme_color: "#e11d48",
          icons: [
            { src: "/icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/icons/pwa-512x512-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
          screenshots: [
            {
              src: "/screenshots/mobile.png",
              sizes: "1080x1920",
              type: "image/png",
              form_factor: "narrow",
            },
            {
              src: "/screenshots/desktop-wide.png",
              sizes: "1920x1080",
              type: "image/png",
              form_factor: "wide",
            },
          ],
        },
        workbox: {
          navigateFallback: "/index.html",

          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
