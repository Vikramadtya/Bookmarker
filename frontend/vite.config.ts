import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Matches whole package directories, so "react" does not also catch "react-hook-form".
const inPackages = (id: string, packages: string[]) =>
  packages.some((name) => id.includes(`/node_modules/${name}/`));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Precache only HTML/CSS: JS bundles are hashed and change on every deploy.
      workbox: { globPatterns: ["**/*.{html,css}"] },
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
        // Stable vendor chunks stay cached across deploys of app code.
        manualChunks(id: string) {
          if (
            inPackages(id, [
              "react",
              "react-dom",
              "react-router",
              "react-router-dom",
              "scheduler",
            ])
          ) {
            return "react-vendor";
          }
          if (
            inPackages(id, [
              "@tanstack/react-query",
              "@tanstack/query-core",
              "@tanstack/react-virtual",
            ])
          ) {
            return "query-vendor";
          }
          if (inPackages(id, ["framer-motion", "motion-dom", "motion-utils"]))
            return "motion-vendor";
          if (
            inPackages(id, [
              "@dnd-kit/core",
              "@dnd-kit/utilities",
              "@dnd-kit/accessibility",
            ])
          ) {
            return "dnd-vendor";
          }
        },
      },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 5173 },
});
