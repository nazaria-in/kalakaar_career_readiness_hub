// apps/mobile/src/lib/supabase/secure-storage.ts
import * as SecureStore from "expo-secure-store";

const CHUNK_SIZE = 1800;

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await SecureStore.getItemAsync(`${key}__n`);
    if (!count) return null;
    let value = "";
    for (let i = 0; i < Number(count); i++) {
      const part = await SecureStore.getItemAsync(`${key}__${i}`);
      if (part == null) return null;
      value += part;
    }
    return value;
  },

  async setItem(key: string, value: string): Promise<void> {
    const parts = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < parts; i++) {
      await SecureStore.setItemAsync(
        `${key}__${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      );
    }
    await SecureStore.setItemAsync(`${key}__n`, String(parts));
  },

  async removeItem(key: string): Promise<void> {
    const count = await SecureStore.getItemAsync(`${key}__n`);
    if (count) {
      for (let i = 0; i < Number(count); i++) {
        await SecureStore.deleteItemAsync(`${key}__${i}`);
      }
    }
    await SecureStore.deleteItemAsync(`${key}__n`);
  },
};