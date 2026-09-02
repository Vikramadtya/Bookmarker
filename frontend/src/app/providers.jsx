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
    let wakeTimeoutId = setTimeout(() => {
      toast.loading("Waking up server (can take up to 50s on free tier)...", {
        id: "server-wakeup",
        duration: 60000,
      });
    }, 1500);

    fetch(`${BACKEND_URL}/health`)
      .then(() => toast.dismiss("server-wakeup"))
      .catch(() => toast.dismiss("server-wakeup"))
      .finally(() => clearTimeout(wakeTimeoutId));

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
