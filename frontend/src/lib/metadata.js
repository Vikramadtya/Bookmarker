export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
export const BASE_URL = import.meta.env.VITE_API_URL || `${BACKEND_URL}/api/v1`;
export const AUTH_URL = import.meta.env.VITE_AUTH_URL || `${BACKEND_URL}/auth`;
export const REDIRECT_URL_AFTER_LOGIN = "/home";

export const SITE_METADATA = {
  appName: "Keeper",
  title: "",
  description: "",
  metadata: "",
};

export const BEARER_TOKEN =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30";
