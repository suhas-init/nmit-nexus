"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { RealtimeBridge } from "./realtime-bridge";
import { ToastHost } from "./toast-host";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return (
    <QueryClientProvider client={client}>
      <RealtimeBridge />
      {children}
      <ToastHost />
    </QueryClientProvider>
  );
}
