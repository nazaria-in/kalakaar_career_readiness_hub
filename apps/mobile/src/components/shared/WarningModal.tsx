// /components/shared/WarningModal.tsx
import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { AlertTriangle, Info } from "lucide-react-native";
import { Modal } from "@/components/shared/Modal";

export interface WarningModalProps {
  open: boolean;
  onClose: () => void;
  /** Omit to render as an info notice with a single "Got it" button instead of confirm/cancel. */
  onConfirm?: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" = destructive (red). "warning" = cautionary, non-destructive (brand). Default "warning". */
  variant?: "danger" | "warning";
  isLoading?: boolean;
  /** Keeps the modal open and shows this instead of closing on a failed confirm action. */
  errorMessage?: string | null;
}

export function WarningModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "warning",
  isLoading = false,
  errorMessage = null,
}: WarningModalProps) {
  const isInfoOnly = !onConfirm;
  const isDanger = variant === "danger";

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-sm">
      <View className="gap-4">
        <View className="flex-row items-start gap-3">
          <View
            className={`h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isDanger ? "bg-destructive/10 " : "bg-accent "
            }`}
          >
            {isDanger ? (
              <AlertTriangle size={18} className="text-destructive " />
            ) : (
              <Info size={18} className="text-text-accent " />
            )}
          </View>
          <Text className="flex-1 pt-1.5 text-sm leading-relaxed text-text-primary/70 ">
            {description}
          </Text>
        </View>

        {errorMessage ? (
          <View className="rounded-lg bg-destructive/10 px-3 py-2 ">
            <Text className="text-xs text-destructive ">{errorMessage}</Text>
          </View>
        ) : null}

        <View className="flex-row justify-end gap-2 pt-1">
          {!isInfoOnly ? (
            <Pressable
              onPress={onClose}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              accessibilityState={{ disabled: isLoading }}
              className={`rounded-full border border-border px-4 py-2 active:opacity-70  ${
                isLoading ? "opacity-50" : ""
              }`}
            >
              <Text className="text-sm font-medium text-text-primary ">{cancelLabel}</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={isInfoOnly ? onClose : onConfirm}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={isInfoOnly ? "Got it" : confirmLabel}
            accessibilityState={{ disabled: isLoading }}
            className={`rounded-full px-4 py-2 active:opacity-70 ${
              isDanger ? "bg-destructive " : "bg-primary "
            } ${isLoading ? "opacity-50" : ""}`}
          >
            <Text
              className={`text-sm font-medium ${
                isDanger ? "text-white " : "text-primary-foreground "
              }`}
            >
              {isLoading ? "Working…" : isInfoOnly ? "Got it" : confirmLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}