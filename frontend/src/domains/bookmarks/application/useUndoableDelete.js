import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { makeApiRequest } from "@/lib/api";
import { BASE_URL } from "@/lib/metadata";
import { useAppStore } from "@/store/useAppStore";
import { removeBookmarks } from "./bookmarkCache";

const UNDO_WINDOW_MS = 5000;

// Deletes still waiting out their undo window, so a closing tab can finish them.
const outstanding = new Set();

const bulkDeleteUrl = `${BASE_URL}/bookmarks/bulk-delete`;

function flushOnPageHide() {
  for (const ids of outstanding) {
    fetch(bulkDeleteUrl, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
  }
  outstanding.clear();
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushOnPageHide);
}

/**
 * Deletes bookmarks after a short undo window: they disappear at once, a toast
 * offers Undo, and the request is only sent when the window closes.
 */
export function useUndoableDelete() {
  const queryClient = useQueryClient();
  const setPending = useAppStore((s) => s.setPendingDeletes);
  const setSelectedId = useAppStore((s) => s.setSelectedBookmarkId);

  return useCallback(
    (ids) => {
      if (ids.length === 0) return;
      const { pendingDeletes, selectedBookmarkId } = useAppStore.getState();
      setPending(new Set([...pendingDeletes, ...ids]));
      if (ids.includes(selectedBookmarkId)) setSelectedId(null);
      outstanding.add(ids);

      const release = () => {
        const current = useAppStore.getState().pendingDeletes;
        setPending(new Set([...current].filter((id) => !ids.includes(id))));
      };

      const commit = async () => {
        if (!outstanding.delete(ids)) return; // already flushed or undone
        try {
          await makeApiRequest({
            url: bulkDeleteUrl,
            method: "POST",
            body: { ids },
          });
          removeBookmarks(queryClient, ids);
          queryClient.invalidateQueries({ queryKey: ["tags"] });
        } finally {
          release(); // on failure the bookmarks reappear
        }
      };

      const timer = setTimeout(commit, UNDO_WINDOW_MS);
      const count = ids.length;
      toast(count === 1 ? "Bookmark deleted" : `${count} bookmarks deleted`, {
        duration: UNDO_WINDOW_MS,
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timer);
            outstanding.delete(ids);
            release();
          },
        },
      });
    },
    [queryClient, setPending, setSelectedId]
  );
}
