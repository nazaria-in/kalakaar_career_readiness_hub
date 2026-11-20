// packages/ui/src/primitives.tsx
import {
  Pressable as RNPressable,
  Text as RNText,
  View as RNView,
} from "react-native";
import { cssInterop } from "react-native-css-interop";

// Map className -> style. Without this, className is dropped on react-native-web.
cssInterop(RNView, { className: "style" });
cssInterop(RNText, { className: "style" });
cssInterop(RNPressable, { className: "style" });

export const View = RNView;
export const Text = RNText;
export const Pressable = RNPressable;