import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Backend origin for the dev proxy. Override when the API runs on a non-default
// port, e.g. API_PROXY_TARGET=http://localhost:8090 pnpm dev
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8080";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Go backend during development.
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/healthz": apiTarget,
    },
  },
});
