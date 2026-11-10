import { supabase } from "../supabase/client";
import type { ApiRequest } from "@repo/shared";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

export const mobileApiRequest: ApiRequest = async (path, init) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
};