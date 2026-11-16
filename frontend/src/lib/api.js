import axios from "axios";
import { toast } from "sonner";
import { logger } from "./logger";
import { useAppStore } from "@/store/useAppStore";

// The auth cookie is httpOnly, so requests only need `withCredentials`.
const client = axios.create({ withCredentials: true });

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const { silent } = error.config?.meta ?? {};
    const status = error.response?.status;

    if (status === 401) window.dispatchEvent(new Event("unauthorized"));

    // The plan does not allow this: offer the upgrade instead of a bare error.
    if (status === 402) {
      toast.error(error.response.data?.message || "This is part of Pro.", {
        id: "upgrade",
        duration: 8000,
        action: {
          label: "See plans",
          onClick: () => useAppStore.getState().openSettings("billing"),
        },
      });
      return Promise.reject(error);
    }

    if (!silent) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Something went wrong.";
      // Many requests fail together when the server is unreachable: say it once.
      if (!error.response) {
        toast.error(
          "Can't reach the server. Your changes will sync when it's back.",
          {
            id: "network-error",
          }
        );
      } else toast.error(Array.isArray(message) ? message[0] : message);
    }
    return Promise.reject(error);
  }
);

/** `meta.silent` suppresses the error toast (for expected failures such as the auth probe). */
export async function makeApiRequest({
  url,
  method = "GET",
  body,
  headers,
  meta,
}) {
  logger.debug(`${method} ${url}`);
  const { data } = await client.request({
    url,
    method,
    data: body,
    headers,
    meta,
  });
  return data;
}
