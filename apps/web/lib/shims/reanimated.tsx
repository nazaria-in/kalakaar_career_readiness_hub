// apps/web/lib/shims/reanimated.tsx
// css-interop only uses reanimated for animations on native. Web doesn't need it.
export default {};
export const useSharedValue = <T,>(v: T) => ({ value: v });
export const useAnimatedStyle = () => ({});
export const withTiming = <T,>(v: T) => v;