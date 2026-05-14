// intent: Vite config for the Studio React frontend
// status: done
// next: extend with proxy for engine HTTP if we ever leave Tauri IPC
// confidence: high

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Tauri expects a fixed port, fail if that port is not available
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // Tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Env vars starting with `VITE_` are exposed to the client
  envPrefix: ["VITE_", "TAURI_"],

  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: true,
    // The 3D graph stack is isolated behind lazy panels; keep warnings focused on eager chunks.
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@tauri-apps")) return "tauri";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("@codemirror") || id.includes("@uiw/react-codemirror")) return "editor";
          if (id.includes("@xyflow")) return "flow";
          if (id.includes("react-force-graph") || id.includes("three") || id.includes("3d-force-graph")) {
            return "graph3d";
          }
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
          return "vendor";
        },
      },
    },
  },
}));
