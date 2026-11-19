// apps/mobile/src/lib/api/auth.ts
import { useSessionStore } from "../../store/session-store";
import { supabase } from "../supabase/client";
import * as shared from "@repo/shared";

export const mobileAuth = {
  signIn: (email: string, password: string) => shared.signIn(supabase, { email, password }),
  signUp: (fullName: string, email: string, password: string) =>
    shared.signUp(supabase, { fullName, email, password, emailRedirectTo: "nazaria://auth/callback" }),
  signOut: () => shared.signOut(supabase),
  setRole: (userId: string, role: shared.UserRole) => shared.setUserRole(supabase, userId, role),
  requestPasswordReset: (email: string) =>
    shared.requestPasswordReset(supabase, email, "nazaria://auth/reset-password"),
  updatePassword: (password: string) => shared.updatePassword(supabase, password),
};