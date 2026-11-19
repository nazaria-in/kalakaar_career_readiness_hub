// apps/mobile/src/app/_layout.tsx
import "../global.css";

import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { useColorScheme } from "react-native";
import { AppProviders } from "../providers";
import { RoleProvider } from "@/providers/role-provider";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <RoleProvider>
    <ThemeProvider value={colorScheme === "light" ? DarkTheme : DefaultTheme}>
      <AppProviders>
        <Stack screenOptions={{ headerShown: false }} />
      </AppProviders>
    </ThemeProvider>
    </RoleProvider>
  );
}