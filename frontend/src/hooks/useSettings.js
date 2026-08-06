import { useMutation, useQueryClient } from "@tanstack/react-query";
import { makeApiRequest } from "@/lib/utils";
import { BASE_URL } from "@/lib/metadata";
import { toast } from "sonner";

export function useDeleteAllData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      makeApiRequest({ url: `${BASE_URL}/settings/data`, method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("All data has been deleted.");
    },
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const response = await makeApiRequest({
        url: `${BASE_URL}/settings/export`,
        method: "GET",
      });
      return response;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookmarks_export_${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Export successful!");
    },
  });
}

export function useImportData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (htmlContent) =>
      makeApiRequest({
        url: `${BASE_URL}/settings/import`,
        method: "POST",
        body: { htmlContent },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Bookmarks imported successfully!");
    },
  });
}

export function useUpdateUsername() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (username) =>
      makeApiRequest({
        url: `${BASE_URL}/users/me/username`,
        method: "PUT",
        body: { username },
      }),
    onSuccess: () => {
      // Refresh user details
      queryClient.invalidateQueries({ queryKey: ["auth-status"] });
      toast.success("Username updated successfully!");
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to update username"
      );
    },
  });
}
