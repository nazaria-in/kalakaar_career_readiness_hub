// apps/mobile/src/lib/supabase/secure-storage.web.ts
// Used by the web bundle and by Expo Router's Node render pass.
// expo-secure-store has no web or Node implementation.
export const secureStorage = {
  getItem: async (key: string): Promise<string | null> =>
    typeof window !== "undefined" ? window.localStorage.getItem(key) : null,
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};