// apps/mobile/src/app/_layout.tsx
import "../global.css";

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { View, Text } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppProviders } from "@/providers";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProviders>
      {/* NativeWind test banner — remove once confirmed working */}
      <View className="bg-blue-500 py-2 items-center">
        <Text className="text-white font-bold text-sm">✅ NativeWind is working</Text>
      </View>
      <AnimatedSplashOverlay />
      <AppTabs />
      </AppProviders>
    </ThemeProvider>
  );
}