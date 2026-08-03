import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { makeApiRequest } from "@/lib/utils";
import { BASE_URL } from "@/lib/metadata";
import { toast } from "sonner";

export function useFolders() {
  return useQuery({
    queryKey: ["folders"],
    queryFn: async () => {
      const data = await makeApiRequest({
        url: `${BASE_URL}/folders`,
        method: "GET",
        name: "Fetch Folders",
      });
      return data;
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, parentId = null }) => {
      return await makeApiRequest({
        url: `${BASE_URL}/folders`,
        method: "POST",
        name: "Create Folder",
        body: { name, parentId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder created");
    },
    onError: () => {
      toast.error("Failed to create folder");
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => {
      if (id === "root") throw new Error("Cannot delete root");
      const query = action ? `?action=${action}` : "";
      return await makeApiRequest({
        url: `${BASE_URL}/folders/${id}${query}`,
        method: "DELETE",
        name: "Delete Folder",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder deleted");
    },
    onError: () => {
      toast.error("Failed to delete folder");
    },
  });
}
