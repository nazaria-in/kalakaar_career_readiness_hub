// apps/web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "react-native-web",
    "react-native-css-interop",
    "nativewind",
    "@repo/ui",
  ],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
      "react-native-safe-area-context": "./lib/shims/safe-area-context.tsx",
      "react-native-reanimated": "./lib/shims/reanimated.tsx",
    },
    resolveExtensions: [".web.tsx", ".web.ts", ".web.jsx", ".web.js", ".tsx", ".ts", ".jsx", ".js"],
  },
};

export default nextConfig;