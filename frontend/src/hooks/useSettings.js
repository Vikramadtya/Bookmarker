import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { makeApiRequest } from "@/lib/utils";
import { toast } from "sonner";

export function useDeleteAllData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => makeApiRequest("/settings/data", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("All data has been deleted.");
    },
    onError: () => {
      toast.error("Failed to delete data. Please try again.");
    },
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      // makeApiRequest usually expects JSON, but here we expect text/html
      const response = await makeApiRequest("/settings/export");
      return response;
    },
    onSuccess: (data) => {
      // Create a blob and download it
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
    onError: () => {
      toast.error("Failed to export data.");
    },
  });
}

export function useImportData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (htmlContent) =>
      makeApiRequest("/settings/import", {
        method: "POST",
        data: { htmlContent },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Bookmarks imported successfully!");
    },
    onError: () => {
      toast.error("Failed to import data.");
    },
  });
}
