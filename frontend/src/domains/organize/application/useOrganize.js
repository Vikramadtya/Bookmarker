import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { makeApiRequest } from "@/lib/api";
import { BASE_URL } from "@/lib/metadata";
import {
  bookmarkKeys,
  patchBookmark,
} from "@/domains/bookmarks/application/bookmarkCache";

const api = (path, options) =>
  makeApiRequest({ url: `${BASE_URL}${path}`, ...options });

/** Things that change whenever bookmarks or tags do. */
export function refreshDerived(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["counts"] });
  queryClient.invalidateQueries({ queryKey: ["tags"] });
  queryClient.invalidateQueries({ queryKey: ["duplicates"] });
  queryClient.invalidateQueries({ queryKey: ["digest"] });
}

// ─── Counts, digest, preferences ────────────────────────────────────────────

export const useCounts = () =>
  useQuery({
    queryKey: ["counts"],
    staleTime: 30_000,
    queryFn: () => api("/bookmarks/counts"),
  });

export const useDigest = () =>
  useQuery({
    queryKey: ["digest"],
    staleTime: 5 * 60_000,
    queryFn: () => api("/digest"),
  });

export const usePreferences = () =>
  useQuery({ queryKey: ["preferences"], queryFn: () => api("/preferences") });

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api("/preferences", { method: "PUT", body: data }),
    onSuccess: (data) =>
      queryClient.setQueryData(["preferences"], (old) => ({ ...old, ...data })),
  });
}

export function useRotateCaptureToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api("/preferences/capture-token", { method: "POST" }),
    onSuccess: (data) =>
      queryClient.setQueryData(["preferences"], (old) => ({ ...old, ...data })),
  });
}

// ─── Saved views ────────────────────────────────────────────────────────────

export const useViews = () =>
  useQuery({
    queryKey: ["views"],
    staleTime: 5 * 60_000,
    queryFn: () => api("/views"),
  });

export function useSaveView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (view) => api("/views", { method: "POST", body: view }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["views"] });
      toast.success("Saved to your sidebar");
    },
  });
}

export function useDeleteView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/views/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["views"] }),
  });
}

// ─── Tags ───────────────────────────────────────────────────────────────────

export function useRenameTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ from, to }) =>
      api("/tags/rename", { method: "POST", body: { from, to } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
      refreshDerived(queryClient);
    },
  });
}

export function useTagColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tag, color }) =>
      api("/tags/color", { method: "PUT", body: { tag, color } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tag) =>
      api(`/tags?tag=${encodeURIComponent(tag)}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
      refreshDerived(queryClient);
    },
  });
}

// ─── Duplicates ─────────────────────────────────────────────────────────────

export const useDuplicateGroups = () =>
  useQuery({
    queryKey: ["duplicates"],
    queryFn: () => api("/bookmarks/duplicates"),
  });

export function useMergeBookmarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ keepId, mergeIds }) =>
      api("/bookmarks/merge", { method: "POST", body: { keepId, mergeIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
      refreshDerived(queryClient);
      toast.success("Merged");
    },
  });
}

/** Is this URL already saved? Used while typing in the add form. */
export const useExistingBookmark = (url) =>
  useQuery({
    queryKey: ["bookmark-check", url],
    enabled: /^https?:\/\/\S+\.\S+/.test(url ?? ""),
    staleTime: 30_000,
    queryFn: () => api(`/bookmarks/check?url=${encodeURIComponent(url)}`),
  });

// ─── Bulk and per-bookmark actions ──────────────────────────────────────────

export function useBulkUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, ...changes }) =>
      api("/bookmarks/bulk-update", {
        method: "POST",
        body: { ids, ...changes },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
      refreshDerived(queryClient);
    },
  });
}

/** Records an open: counts it, and moves an unread bookmark to "reading". */
export function useRecordOpen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/bookmarks/${id}/opened`, { method: "POST" }),
    onSuccess: ({ content: _content, ...updated }, id) => {
      patchBookmark(queryClient, id, updated);
      queryClient.invalidateQueries({ queryKey: ["counts"] });
    },
  });
}

export function useHighlights(id) {
  const queryClient = useQueryClient();
  const apply = ({ highlights }) =>
    patchBookmark(queryClient, id, { highlights });
  return {
    add: useMutation({
      mutationFn: ({ text, note }) =>
        api(`/bookmarks/${id}/highlights`, {
          method: "POST",
          body: { text, note },
        }),
      onSuccess: apply,
    }),
    remove: useMutation({
      mutationFn: (highlightId) =>
        api(`/bookmarks/${id}/highlights/${highlightId}`, { method: "DELETE" }),
      onSuccess: apply,
    }),
  };
}
