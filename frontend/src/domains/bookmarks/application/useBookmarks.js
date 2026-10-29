import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { makeApiRequest } from "@/lib/api";
import { BASE_URL } from "@/lib/metadata";
import { folderTokenHeaders } from "@/lib/folderTokens";
import {
  bookmarkKeys,
  findCachedBookmark,
  patchBookmark,
  removeBookmarks,
} from "./bookmarkCache";

const PAGE_SIZE = 50;

const flattenPages = (data) => data.pages.flatMap((page) => page.items);

function toQueryString({ folderId, q, fields, tag, cursor, limit }) {
  const params = new URLSearchParams();
  if (folderId && folderId !== "root") params.set("folderId", folderId);
  if (q) {
    params.set("q", q);
    if (fields?.length) params.set("fields", fields.join(","));
  }
  if (tag) params.set("tag", tag);
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Infinite, cursor-paginated list; `data` is the flattened array of loaded bookmarks. */
export function useBookmarks({ folderId, q = "", fields = [], tag = "" }) {
  return useInfiniteQuery({
    queryKey: bookmarkKeys.list({ folderId, q, fields: fields.join(","), tag }),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks${toQueryString({ folderId, q, fields, tag, cursor: pageParam, limit: PAGE_SIZE })}`,
        headers: folderTokenHeaders(folderId),
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: flattenPages,
  });
}

/** One-off server-side search (command palette). */
export function useBookmarkSearch({ q, folderId, fields, enabled }) {
  return useQuery({
    queryKey: ["bookmark-search", q, folderId, fields.join(",")],
    enabled: enabled && q.length > 0,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
    queryFn: async () =>
      (
        await makeApiRequest({
          url: `${BASE_URL}/bookmarks${toQueryString({ q, fields, folderId, limit: 20 })}`,
          headers: folderTokenHeaders(folderId),
        })
      ).items,
  });
}

/** A single bookmark, shown from the list cache immediately and refreshed in the background. */
export function useBookmark(id) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: bookmarkKeys.detail(id),
    enabled: Boolean(id),
    // The list omits article content, so always fetch the full record.
    placeholderData: () => findCachedBookmark(queryClient, id),
    staleTime: 60_000,
    queryFn: () => makeApiRequest({ url: `${BASE_URL}/bookmarks/${id}` }),
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    staleTime: 5 * 60_000,
    queryFn: () => makeApiRequest({ url: `${BASE_URL}/bookmarks/tags` }),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks`,
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Bookmark saved", {
        description: "Metadata is being extracted in the background.",
      });
    },
  });
}

export function useUpdateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks/${id}`,
        method: "PUT",
        body: data,
      }),
    // Show the change immediately; roll back by refetching if the server rejects it.
    onMutate: ({ id, data }) => patchBookmark(queryClient, id, data),
    onError: (_error, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.detail(id) });
    },
    onSuccess: ({ content: _content, ...updated }, { id, data }) => {
      patchBookmark(queryClient, id, updated);
      if ("tags" in data) queryClient.invalidateQueries({ queryKey: ["tags"] });
      // Lists whose membership depends on the changed field must be re-evaluated.
      const affectsMembership = "folderId" in data;
      queryClient.invalidateQueries({
        queryKey: bookmarkKeys.all,
        refetchType: "active",
        predicate: (query) =>
          affectsMembership ||
          (query.queryKey[1]?.folderId === "favorites" && "isFavorite" in data),
      });
    },
  });
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      makeApiRequest({ url: `${BASE_URL}/bookmarks/${id}`, method: "DELETE" }),
    onSuccess: (_data, id) => {
      removeBookmarks(queryClient, [id]);
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Bookmark deleted");
    },
  });
}

export function useBulkDeleteBookmarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks/bulk-delete`,
        method: "POST",
        body: { ids },
      }),
    onSuccess: (_data, ids) => {
      removeBookmarks(queryClient, ids);
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Bookmarks deleted");
    },
  });
}

export function useBulkMoveBookmarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, folderId }) =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks/bulk-move`,
        method: "POST",
        body: { ids, folderId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
      toast.success("Bookmarks moved");
    },
  });
}
