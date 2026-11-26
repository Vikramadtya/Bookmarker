import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { makeApiRequest } from "@/lib/api";
import { BASE_URL } from "@/lib/metadata";

const api = (path, options) =>
  makeApiRequest({ url: `${BASE_URL}/organize${path}`, ...options });

/** The latest Claude session. Polls while Claude may still be working. */
export const useClaudeSession = () =>
  useQuery({
    queryKey: ["claude-session"],
    queryFn: () => api("/session"),
    staleTime: 0,
    refetchInterval: (q) =>
      q.state.data?.session?.status === "open" ? 5000 : false,
  });

export const useProposals = (sessionId) =>
  useQuery({
    queryKey: ["claude-proposals", sessionId],
    enabled: !!sessionId,
    staleTime: 0,
    queryFn: () => api(`/session/${sessionId}/proposals`),
  });

export function useClaudeActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["claude-session"] });
    queryClient.invalidateQueries({ queryKey: ["claude-proposals"] });
  };
  /** Applying or undoing changes the library itself. */
  const refreshLibrary = () => {
    refresh();
    for (const key of ["bookmarks", "bookmark", "folders", "tags", "counts"])
      queryClient.invalidateQueries({ queryKey: [key] });
  };
  return {
    start: useMutation({
      mutationFn: (includeNotes) =>
        api("/session", { method: "POST", body: { includeNotes } }),
      onSuccess: refresh,
    }),
    disconnect: useMutation({
      mutationFn: () => api("/connection", { method: "DELETE" }),
      onSuccess: () => {
        refresh();
        toast.success("Claude disconnected");
      },
    }),
    end: useMutation({
      mutationFn: (id) => api(`/session/${id}`, { method: "DELETE" }),
      onSuccess: refresh,
    }),
    apply: useMutation({
      mutationFn: ({ id, ids }) =>
        api(`/session/${id}/apply`, { method: "POST", body: { ids } }),
      onSuccess: ({ applied }) => {
        toast.success(
          applied === 1 ? "Applied 1 change" : `Applied ${applied} changes`
        );
      },
      // Some may have gone through even if a later one failed.
      onSettled: refreshLibrary,
    }),
    reject: useMutation({
      mutationFn: ({ id, ids }) =>
        api(`/session/${id}/reject`, { method: "POST", body: { ids } }),
      onSuccess: refresh,
    }),
    undo: useMutation({
      mutationFn: (id) => api(`/session/${id}/undo`, { method: "POST" }),
      onSuccess: () => toast.success("Changes undone"),
      onSettled: refreshLibrary,
    }),
  };
}

export const useConnectRequest = (key, enabled) =>
  useQuery({
    queryKey: ["claude-connect", key],
    enabled: enabled && !!key,
    retry: false,
    queryFn: () =>
      api(`/connect/${encodeURIComponent(key)}`, { meta: { silent: true } }),
  });

export const useConnectDecision = (key) =>
  useMutation({
    mutationFn: (allow) =>
      api(`/connect/${encodeURIComponent(key)}`, {
        method: "POST",
        body: { allow },
      }),
    onSuccess: ({ redirect }) => {
      sessionStorage.removeItem("pending-connect");
      window.location.assign(redirect);
    },
  });
