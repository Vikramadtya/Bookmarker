import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      // Only precache small static assets (HTML, CSS, SW registration).
      // Do NOT precache JS bundles — they are large and change on every deploy,
      // which would trigger a 900KB+ download for every user on every update.
      workbox: {
        globPatterns: ["**/*.{html,css}"],
      },
      manifest: {
        name: "Bookmarker",
        short_name: "Bookmarker",
        description: "Your modern bookmark manager",
        theme_color: "#ffffff",
        icons: [
          {
            src: "favicon.ico",
            sizes: "64x64 32x32 24x24 16x16",
            type: "image/x-icon",
          },
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Split large vendor libraries into separate cached chunks.
        // Users re-download only what changed — not the entire 912KB bundle.
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("react-router-dom")
          ) {
            return "react-vendor";
          }
          if (id.includes("@tanstack")) {
            return "query-vendor";
          }
          if (
            id.includes("framer-motion") ||
            id.includes("lucide-react") ||
            id.includes("sonner")
          ) {
            return "ui-vendor";
          }
          if (id.includes("@dnd-kit")) {
            return "dnd-vendor";
          }
          if (id.includes("cmdk")) {
            return "editor-vendor";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
});
