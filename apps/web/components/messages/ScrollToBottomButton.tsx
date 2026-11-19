// /components/messages/ScrollToBottomButton.tsx
"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToBottomButtonProps {
  visible: boolean;
  unseenCount: number;
  onClick: () => void;
}

export function ScrollToBottomButton({ visible, unseenCount, onClick }: ScrollToBottomButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full",
        "bg-card  border border-border-strong  shadow-md",
        "px-3 py-2 text-sm font-medium text-text-primary ",
        "hover:bg-card-alt  transition-colors"
      )}
      aria-label="Scroll to latest messages"
    >
      {unseenCount > 0 && (
        <span className="rounded-full bg-primary text-primary-foreground   text-xs px-1.5 py-0.5 min-w-[1.25rem] text-center">
          {unseenCount > 99 ? "99+" : unseenCount}
        </span>
      )}
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}