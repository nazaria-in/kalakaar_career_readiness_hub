/**
 * Nazaria colors for light and dark mode, used from JavaScript (style props, icons, navigation).
 * Class-based styling (className) reads the tokens defined in global.css and tailwind.config.js.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#00504f',
    textSecondary: '#4b6a69',
    textAccent: '#892d3b',
    background: '#ffffff',
    backgroundElement: '#f6f9f8',
    backgroundSelected: '#eaf2f1',
    backgroundStrong: '#ffffff',
    border: '#d7e6e4',
    borderStrong: '#b3dfde',
    primary: '#892d3b',
    primaryForeground: '#ffffff',
    destructive: '#d93a3a',
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#b9d4d2',
    textAccent: '#fcdfab',
    background: '#06302f',
    backgroundElement: '#0c3f3d',
    backgroundSelected: '#14504d',
    backgroundStrong: '#1a5f5c',
    border: 'rgba(255, 255, 255, 0.14)',
    borderStrong: 'rgba(255, 255, 255, 0.28)',
    primary: '#fcdfab',
    primaryForeground: '#00504f',
    destructive: '#f87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Nazaria = {
  burgundy: '#892d3b',
  teal: '#00504f',
  cream: '#fcdfab',
  white: '#ffffff',
  paleTeal: '#b3dfde',
  paleGold: '#ffe1ac',
  palePink: '#ffd7d7',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;