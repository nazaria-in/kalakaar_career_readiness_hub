// apps/mobile/src/porviders/session-provider.tsx
import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { profileToSession, type ProfileRow, type Role } from "@repo/shared";
import { supabase } from "../lib/supabase/client";
import { useSessionStore } from "../store/session-store";

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const setSession = useSessionStore((s) => s.setSession);
  const clearSession = useSessionStore((s) => s.clearSession);

  useEffect(() => {
    async function hydrate(user: User) {
      const { data, error } = await supabase
        .from("users")
        .select("id, role, full_name, approval_status")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        clearSession();
        return;
      }

      const snapshot = profileToSession(data as ProfileRow);
      setSession({
        userId: snapshot.userId,
        fullName: snapshot.fullName,
        role: snapshot.role as Role,
        approvalStatus: snapshot.approvalStatus,
      });
    }

    // INITIAL_SESSION fires once on startup with the persisted session.
    // SIGNED_IN fires after login. Both hydrate the profile.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        queryClient.clear();
        clearSession();
        return;
      }
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        // Don't await inside the listener. Supabase warns about awaiting
        // calls from within auth callbacks.
        void hydrate(session.user);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [queryClient, setSession, clearSession]);

  return <>{children}</>;
}