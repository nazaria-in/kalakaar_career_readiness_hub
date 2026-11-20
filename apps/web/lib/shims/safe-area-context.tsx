// apps/web/lib/shims/safe-area-context.tsx
// Web has no native safe area. These no-op versions keep css-interop happy.
import type { ReactNode } from "react";

export const SafeAreaView = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const SafeAreaProvider = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
export const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 0, height: 0 });
export const initialWindowMetrics = null;