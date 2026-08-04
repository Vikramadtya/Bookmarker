import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { toast } from "sonner";
import { logger } from "./logger";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Global Axios Instance
const apiClient = axios.create({
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Global Error Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const meta = error.config?.meta || {};
    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred.";

    // Check for specific backend validation array or simple string
    const errorMessage = Array.isArray(message) ? message[0] : message;

    // Auto-logout logic for 401s
    if (
      error.response?.status === 401 ||
      String(errorMessage).toLowerCase().includes("unauthorized")
    ) {
      console.warn("Invalid session — auto-signing out.");
      window.dispatchEvent(new Event("unauthorized"));

      if (meta.skip401Logging) {
        return Promise.reject(error); // Suppress toast for expected 401s
      }
    }

    // Show user-friendly toast
    toast.error(errorMessage);

    return Promise.reject(error);
  }
);

export async function makeApiRequest({
  url,
  method,
  headers = {},
  body,
  token,
  name = "unnamed-request",
  type = "generic",
  meta = {},
  onSuccess = () => {},
  onError = (e) => {
    throw e;
  },
  defaultValue = [],
}) {
  const requestId = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    logger.debug(`🔄 ${type.toUpperCase()} - ${name}`);

    const finalToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("bookmarker_token")
        : null);

    const config = {
      url,
      method,
      headers: {
        ...(finalToken && { Authorization: `Bearer ${finalToken}` }),
        ...headers,
        "X-Request-Meta": JSON.stringify({
          requestId,
          timestamp,
          userAgent:
            typeof window !== "undefined" ? navigator.userAgent : "server",
          type,
          name,
          ...meta,
        }),
      },
      data: body,
      meta,
    };

    const response = await apiClient.request(config);
    let data = response.data;

    // Handle enveloped API responses
    if (data && typeof data === "object" && "meta" in data && "data" in data) {
      data = data.data;
    }

    logger.debug(`✅ Success - ${name}`, data);

    onSuccess(data);
    return data;
  } catch (err) {
    if (err.response?.status === 401 && meta.skip401Logging) {
      logger.debug(`ℹ️ Expected 401 (Unauthorized) - ${name}`);
    } else {
      logger.error(`🛑 API Error - ${name}:`, err);
    }
    onError(err);
    // Don't swallow the error, let React Query handle it via throw
    throw err;
  }
}
