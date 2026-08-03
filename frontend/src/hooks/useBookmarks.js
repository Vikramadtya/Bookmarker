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
    mutationFn: async (data) => {
      return await makeApiRequest({
        url: `${BASE_URL}/bookmarks`,
        method: "POST",
        name: "Create Bookmark",
        body: data, // { bookmarkURL, folderId }
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Bookmark saved", {
        description: "Metadata is being extracted in the background.",
      });
    },
    onError: () => {
      toast.error("Failed to save bookmark");
    },
  });
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await makeApiRequest({
        url: `${BASE_URL}/bookmarks/${id}`,
        method: "DELETE",
        name: "Delete Bookmark",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Bookmark deleted");
    },
    onError: () => {
      toast.error("Failed to delete bookmark");
    },
  });
}

export function useUpdateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      return await makeApiRequest({
        url: `${BASE_URL}/bookmarks/${id}`,
        method: "PUT",
        name: "Update Bookmark",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
    onError: () => {
      toast.error("Failed to update bookmark");
    },
  });
}

export function useBulkDeleteBookmarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids) => {
      return await makeApiRequest({
        url: `${BASE_URL}/bookmarks/bulk-delete`,
        method: "POST",
        name: "Bulk Delete Bookmarks",
        body: { ids },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Bookmarks deleted");
    },
    onError: () => {
      toast.error("Failed to delete bookmarks");
    },
  });
}

export function useBulkMoveBookmarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, folderId }) => {
      return await makeApiRequest({
        url: `${BASE_URL}/bookmarks/bulk-move`,
        method: "POST",
        name: "Bulk Move Bookmarks",
        body: { ids, folderId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Bookmarks moved");
    },
    onError: () => {
      toast.error("Failed to move bookmarks");
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      return await makeApiRequest({
        url: `${BASE_URL}/bookmarks/tags`,
        method: "GET",
        name: "Fetch Tags",
      });
    },
  });
}
