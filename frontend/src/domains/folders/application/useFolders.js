import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { makeApiRequest } from "@/lib/api";
import { BASE_URL } from "@/lib/metadata";
import { toast } from "sonner";

export function useFolders() {
  return useQuery({
    queryKey: ["folders"],
    queryFn: async () =>
      makeApiRequest({
        url: `${BASE_URL}/folders`,
        method: "GET",
      }),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, parentId = null }) =>
      makeApiRequest({
        url: `${BASE_URL}/folders`,
        method: "POST",
        body: { name, parentId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder created");
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => {
      if (id === "root") throw new Error("Cannot delete root");
      const query = action ? `?action=${action}` : "";
      return makeApiRequest({
        url: `${BASE_URL}/folders/${id}${query}`,
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder deleted");
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) =>
      makeApiRequest({
        url: `${BASE_URL}/folders/${id}`,
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}
