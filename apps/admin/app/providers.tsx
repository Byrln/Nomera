"use client";
import { TooltipProvider } from "@nomera/ui/components/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AdminThemeProvider } from "@/components/admin-theme-provider";
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60000, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AdminThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </AdminThemeProvider>
    </QueryClientProvider>
  );
}
