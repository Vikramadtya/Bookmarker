import { makeApiRequest } from "./api";
import { BASE_URL } from "./metadata";

const KEY = "pending-saves";
const MAX = 50;
let flushing = false;

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
};
const write = (items) => {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage is full or blocked: the link is lost only if the request also failed */
  }
};

/** Offline, a sleeping server (5xx) or a timeout: worth trying again later. */
export const isRetryable = (error) => {
  const status = error?.response?.status;
  return !status || status >= 500 || status === 408;
};

export const queueSave = (payload) => write([...read(), payload].slice(-MAX));

export const pendingCount = () => read().length;

/** Sends queued saves in order; stops at the first failure so nothing is reordered. */
export async function flushSaveQueue() {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const payload of read()) {
      try {
        await makeApiRequest({
          url: `${BASE_URL}/bookmarks`,
          method: "POST",
          body: payload,
          meta: { silent: true },
        });
      } catch (error) {
        // A link the server rejects outright would block the queue forever.
        if (isRetryable(error)) break;
      }
      write(read().slice(1));
      sent++;
    }
  } finally {
    flushing = false;
  }
  return sent;
}
