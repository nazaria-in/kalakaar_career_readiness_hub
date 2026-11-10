import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QUERY_DEFAULTS } from "@repo/shared";

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState keeps one client per app lifetime. React Native has no SSR,
  // so no need for the web's browser/server split.
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { ...QUERY_DEFAULTS } } })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}