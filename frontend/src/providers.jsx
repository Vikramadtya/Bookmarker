import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { BASE_URL } from "@/lib/metadata";
import { Toaster } from "sonner";
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
    // Get base domain from BASE_URL (assuming BASE_URL is http://localhost:8080/api/v1)
    let socketUrl = "http://localhost:8080";
    try {
      const url = new URL(BASE_URL);
      socketUrl = url.origin;
    } catch (e) {}

    const socket = io(socketUrl);

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
