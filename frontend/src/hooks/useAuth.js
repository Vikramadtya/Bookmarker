import { useQuery, useQueryClient } from "@tanstack/react-query";
import { makeApiRequest } from "@/lib/utils";
import { AUTH_URL } from "@/lib/metadata";

export function useAuth() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["auth-status"],
    queryFn: async () => {
      try {
        const data = await makeApiRequest({
          url: `${AUTH_URL}/status`,
          method: "GET",
          name: "fetchAuthStatus",
          meta: { skip401Logging: true },
        });
        return data; // returns the user object
      } catch (err) {
        if (err.response?.status === 401) {
          return null; // Not authenticated
        }
        throw err;
      }
    },
    retry: false, // Don't retry on 401
    staleTime: Infinity, // Keep the session valid until explicitly invalidated
  });
}
