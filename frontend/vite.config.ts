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
      workbox: {
        // Precache only HTML/CSS: JS bundles are hashed and change on every deploy.
        globPatterns: ["**/*.{html,css}"],
        // These are proxied to the backend. Without this the service worker
        // answers the Google login redirect with index.html and sign-in never starts.
        navigateFallbackDenylist: [/^\/auth\//, /^\/api\//, /^\/share\//],
      },
      manifest: {
        name: "Bookmarker",
        short_name: "Bookmarker",
        // Lets installed phones send links here from the system Share menu.
        share_target: {
          action: "/save",
          method: "GET",
          params: { title: "title", text: "text", url: "url" },
        },
        description: "Your modern bookmark manager",
        theme_color: "#ffffff",
        icons: [
          {
            src: "/favicon/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/favicon/web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
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
