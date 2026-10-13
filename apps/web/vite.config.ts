import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  envDir: path.resolve(__dirname, "../.."),
  plugins: [
    react(),
    runtimeErrorOverlay(),
  ],
  // Mirror apps/web/nginx/nginx.conf so dev resolves the API exactly the way
  // production does — same-origin relative paths, no CORS involved.
  //
  // Without this the app is broken in dev: API_BASE_URL resolves to the relative
  // "/api/v1" (VITE_API_BASE_URL is empty by default), so the request goes to
  // Vite itself. Vite answers a miss with index.html and a 200, the client tries
  // JSON.parse on HTML, and login dies with "Unexpected character at line 1
  // column 1" without ever reaching the backend.
  server: {
    proxy: {
      // `ws: true` also carries the chat/notification WebSocket, which is built
      // from this same base URL (see services/message-service.tsx).
      "/api/v1": {
        target: process.env.VITE_DEV_BACKEND_URL ?? "http://localhost:5500",
        changeOrigin: true,
        ws: true,
      },
      // Static assets the API serves; nginx proxies these for the same reason.
      "/uploads": {
        target: process.env.VITE_DEV_BACKEND_URL ?? "http://localhost:5500",
        changeOrigin: true,
      },
      "/images": {
        target: process.env.VITE_DEV_BACKEND_URL ?? "http://localhost:5500",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
});
