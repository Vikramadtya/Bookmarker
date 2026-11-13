import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";

const KEY = "bookmarker-query-cache";

/** Saves the query cache to IndexedDB so the app opens instantly with your last view. */
export const persister = createAsyncStoragePersister({
  key: KEY,
  throttleTime: 2000,
  storage: {
    getItem: (key) => get(key).catch(() => null),
    setItem: (key, value) => set(key, value).catch(() => {}),
    removeItem: (key) => del(key).catch(() => {}),
  },
});

export const clearPersistedCache = () => {
  del(KEY).catch(() => {});
};
