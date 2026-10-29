import axios from "axios";
import { toast } from "sonner";
import { logger } from "./logger";

// The auth cookie is httpOnly, so requests only need `withCredentials`.
const client = axios.create({ withCredentials: true });

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const { silent } = error.config?.meta ?? {};
    const status = error.response?.status;

    if (status === 401) window.dispatchEvent(new Event("unauthorized"));

    if (!silent) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Something went wrong.";
      toast.error(Array.isArray(message) ? message[0] : message);
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
