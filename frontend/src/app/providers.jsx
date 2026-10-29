import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { domAnimation, LazyMotion } from "framer-motion";
import { Toaster, toast } from "sonner";
import { ThemeProvider } from "next-themes";
import { SERVER_ORIGIN } from "@/lib/metadata";
import { endSession, useAuth } from "@/domains/identity/application/useAuth";
import { patchBookmark } from "@/domains/bookmarks/application/bookmarkCache";

const WAKEUP_TOAST = "server-wakeup";

const pill = (children) => (
  <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#334155] px-4 py-2 text-sm font-medium text-white shadow-lg">
    {children}
  </div>
);

/** Free-tier hosts sleep when idle: tell the user while the first request wakes the server. */
function useServerWakeup() {
  useEffect(() => {
    let cancelled = false;
    let retry;
    let showing = false;

    const slowTimer = setTimeout(() => {
      showing = true;
      toast.custom(
        () =>
          pill(
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
              Waiting for backend server to start. Give it a min to start...
            </>
          ),
        { id: WAKEUP_TOAST, duration: Infinity, position: "top-center" }
      );
    }, 1000);

    const ping = async () => {
      try {
        const res = await fetch(`${SERVER_ORIGIN}/health`);
        if (!res.ok) throw new Error("Not ready");
        clearTimeout(slowTimer);
        if (showing) {
          toast.custom(() => pill("Backend server is ready!"), {
            id: WAKEUP_TOAST,
            duration: 3000,
            position: "top-center",
          });
        }
      } catch {
        if (!cancelled) retry = setTimeout(ping, 3000);
      }
    };
    ping();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      clearTimeout(retry);
      toast.dismiss(WAKEUP_TOAST);
    };
  }, []);
}

/** Applies live scrape results from the server straight into the query cache. */
function RealtimeSync() {
  const queryClient = useQueryClient();
  const { data: user } = useAuth();
  const signedIn = Boolean(user);

  useEffect(() => {
    if (!signedIn) return;
    // Authenticated by the httpOnly cookie sent with the handshake.
    const socket = io(SERVER_ORIGIN, {
      transports: ["websocket"],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socket.on("bookmarkUpdated", ({ bookmarkId, ...patch }) => {
      patchBookmark(queryClient, bookmarkId, patch);
    });
    return () => socket.disconnect();
  }, [signedIn, queryClient]);

  return null;
}

function SessionExpiry() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const onUnauthorized = () => {
      // Skip when already signed out, otherwise the auth probe's own 401 would loop.
      if (queryClient.getQueryData(["auth-status"]) === null) return;
      endSession(queryClient);
    };
    window.addEventListener("unauthorized", onUnauthorized);
    return () => window.removeEventListener("unauthorized", onUnauthorized);
  }, [queryClient]);
  return null;
}

export default function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60_000, refetchOnWindowFocus: false },
        },
      })
  );
  useServerWakeup();

  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionExpiry />
          <RealtimeSync />
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </LazyMotion>
    </QueryClientProvider>
  );
}
