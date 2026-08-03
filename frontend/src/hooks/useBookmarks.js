import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { makeApiRequest } from "@/lib/utils";
import { BASE_URL } from "@/lib/metadata";
import { toast } from "sonner";

export function useBookmarks(folderId, q = "", fields = []) {
  return useQuery({
    queryKey: ["bookmarks", folderId, q, fields.join(",")],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (folderId && folderId !== "root") {
        params.append("folderId", folderId);
      }
      if (q && fields.length > 0) {
        params.append("q", q);
        params.append("fields", fields.join(","));
      }

      const queryString = params.toString();
      const url = `${BASE_URL}/bookmarks${queryString ? `?${queryString}` : ""}`;

      return await makeApiRequest({
        url,
        method: "GET",
        name: "Fetch Bookmarks",
      });
    },
  });
}

export function useCreateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks`,
        method: "POST",
        name: "Create Bookmark",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Bookmark saved", {
        description: "Metadata is being extracted in the background.",
      });
    },
  });
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks/${id}`,
        method: "DELETE",
        name: "Delete Bookmark",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Bookmark deleted");
    },
  });
}

export function useUpdateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks/${id}`,
        method: "PUT",
        name: "Update Bookmark",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useBulkDeleteBookmarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids) =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks/bulk-delete`,
        method: "POST",
        name: "Bulk Delete Bookmarks",
        body: { ids },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Bookmarks deleted");
    },
  });
}

export function useBulkMoveBookmarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, folderId }) =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks/bulk-move`,
        method: "POST",
        name: "Bulk Move Bookmarks",
        body: { ids, folderId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Bookmarks moved");
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks/tags`,
        method: "GET",
        name: "Fetch Tags",
      }),
  });
}
