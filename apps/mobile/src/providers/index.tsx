import type { ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { SessionProvider } from "./session-provider";
import { RoleProvider } from "./role-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SessionProvider>
        <RoleProvider>{children}</RoleProvider>
      </SessionProvider>
    </QueryProvider>
  );
}