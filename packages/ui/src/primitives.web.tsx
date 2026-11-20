// packages/ui/src/primitives.web.tsx
// Web: plain DOM elements. Tailwind classes go straight to the DOM.
import type { ComponentProps } from "react";

type DivProps = ComponentProps<"div">;
type SpanProps = ComponentProps<"span">;
type ButtonProps = ComponentProps<"button"> & { onPress?: () => void };

export function View({ className, ...rest }: DivProps) {
  return <div className={className} {...rest} />;
}

export function Text({ className, ...rest }: SpanProps) {
  return <span className={className} {...rest} />;
}

export function Pressable({ className, onPress, onClick, ...rest }: ButtonProps) {
  return (
    <button type="button" className={className} onClick={onClick ?? onPress} {...rest} />
  );
}