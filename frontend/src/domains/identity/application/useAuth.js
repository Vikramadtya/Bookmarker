import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { makeApiRequest } from "@/lib/api";
import { AUTH_URL } from "@/lib/metadata";
import { clearPersistedCache } from "@/lib/persist";

const LAST_USER = "last-user";

const readLastUser = () => {
  try {
    return JSON.parse(localStorage.getItem(LAST_USER));
  } catch {
    return null;
  }
};
const writeLastUser = (user) => {
  try {
    if (user) localStorage.setItem(LAST_USER, JSON.stringify(user));
    else localStorage.removeItem(LAST_USER);
  } catch {
    // Private mode: the app just opens from the network instead.
  }
};

export function useAuth() {
  return useQuery({
    queryKey: ["auth-status"],
    // Open straight into the app from the last known user while the session
    // is verified in the background. A 401 below still signs them out.
    initialData: readLastUser() ?? undefined,
    queryFn: async ({ client }) => {
      const previous = readLastUser();
      try {
        const user = await makeApiRequest({
          url: `${AUTH_URL}/status`,
          meta: { silent: true },
        });
        // A different account signed in on this device: drop the old one's data.
        if (previous?.email && user?.email && previous.email !== user.email)
          endSession(client, { keepAuth: true });
        writeLastUser(user);
        return user;
      } catch (err) {
        if (err.response?.status === 401) {
          writeLastUser(null);
          return null; // not signed in
        }
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
export function endSession(queryClient, { keepAuth = false } = {}) {
  if (!keepAuth) {
    queryClient.setQueryData(["auth-status"], null);
    writeLastUser(null);
  }
  clearPersistedCache();
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
