export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
export const BASE_URL = import.meta.env.VITE_API_URL || `${BACKEND_URL}/api/v1`;
// Origin the API is reached through. A relative VITE_API_URL (e.g. "/api/v1")
// resolves to the page's own origin, which keeps auth cookies first-party.
export const SERVER_ORIGIN = new URL(BASE_URL, window.location.origin).origin;
export const AUTH_URL =
  import.meta.env.VITE_AUTH_URL || `${SERVER_ORIGIN}/auth`;
// WebSockets can't go through Vercel rewrites, so they may need a direct URL.
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || SERVER_ORIGIN;

export const SITE_METADATA = {
  appName: "Bookmarker",
  title: "Bookmarker — Your personal bookmark manager",
  description: "Save, organize, and find your bookmarks instantly.",
};
