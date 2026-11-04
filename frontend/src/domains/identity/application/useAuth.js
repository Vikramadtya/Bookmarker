import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { makeApiRequest } from "@/lib/api";
import { AUTH_URL } from "@/lib/metadata";

export function useAuth() {
  return useQuery({
    queryKey: ["auth-status"],
    queryFn: async () => {
      try {
        return await makeApiRequest({
          url: `${AUTH_URL}/status`,
          meta: { silent: true },
        });
      } catch (err) {
        if (err.response?.status === 401) return null; // not signed in
        throw err;
      }
    },
    // Only a 401 means "signed out". Anything else (a sleeping Render server
    // answering 502/504, a dropped connection) is retried, so a cold start
    // never looks like a logout.
    retry: (count, err) => err.response?.status !== 401 && count < 15,
    retryDelay: 3000,
    staleTime: Infinity, // the session is re-checked only when something signals it ended
  });
}

/** Marks the user signed out and drops their cached data without refetching any of it. */
export function endSession(queryClient) {
  queryClient.setQueryData(["auth-status"], null);
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "auth-status",
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      makeApiRequest({ url: `${AUTH_URL}/logout`, method: "POST" }),
    onSettled: () => endSession(queryClient),
  });
}
