import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { BASE_URL, BACKEND_URL } from "@/lib/metadata";
import { Toaster, toast } from "sonner";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    // 1. Wake up server on load (helpful for Render free-tier instances)
    let isWaking = false;
    const toastId = "server-wakeup";

    const wakeTimeoutId = setTimeout(() => {
      isWaking = true;
      toast.custom(
        (t) => (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#334155] px-4 py-2 text-sm font-medium text-white shadow-lg">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
            Waiting for backend server to start. Give it a min to start...
          </div>
        ),
        {
          id: toastId,
          duration: Infinity, // Remains visible until dismissed
          position: "top-center",
        }
      );
    }, 1000); // Show if it takes longer than 1s

    const pingServer = () => {
      fetch(`${BACKEND_URL}/health`)
        .then((res) => {
          if (!res.ok) throw new Error("Not ready");
          clearTimeout(wakeTimeoutId);
          if (isWaking) {
            toast.custom(
              (t) => (
                <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#334155] px-4 py-2 text-sm font-medium text-white shadow-lg">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3 text-white"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  Backend server is ready!
                </div>
              ),
              {
                id: toastId,
                duration: 3000,
                position: "top-center",
              }
            );
          }
        })
        .catch(() => {
          // Keep polling every 3 seconds if fetch fails (e.g., connection reset while Render wakes)
          setTimeout(pingServer, 3000);
        });
    };

    pingServer();

    // 2. Setup WebSocket connection
    // Get base domain from BASE_URL (assuming BASE_URL is http://localhost:8080/api/v1)
    let socketUrl = "http://localhost:8080";
    try {
      const url = new URL(BASE_URL);
      socketUrl = url.origin;
    } catch (e) {}

    const socket = io(socketUrl, {
      // Skip HTTP long-polling handshake and connect directly via WebSocket.
      // This eliminates the extra HTTP round-trip that happens by default.
      transports: ["websocket"],
      // Retry up to 5 times with 2s delay before giving up silently.
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("bookmarkUpdated", (data) => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    });

    const handleUnauthorized = () => {
      localStorage.removeItem("bookmarker_token");
      queryClient.setQueryData(["auth-status"], null);
    };
    window.addEventListener("unauthorized", handleUnauthorized);

    return () => {
      socket.disconnect();
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
