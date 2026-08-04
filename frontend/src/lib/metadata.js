export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
export const BASE_URL = import.meta.env.VITE_API_URL || `${BACKEND_URL}/api/v1`;
export const AUTH_URL =
  import.meta.env.VITE_AUTH_URL || BASE_URL.replace("/api/v1", "/auth");

export const SITE_METADATA = {
  appName: "Bookmarker",
  title: "Bookmarker — Your personal bookmark manager",
  description: "Save, organize, and find your bookmarks instantly.",
};
