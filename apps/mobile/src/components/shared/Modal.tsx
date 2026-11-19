// /components/shared/Modal.tsx
import * as React from "react";
import { Modal as RNModal, Pressable, ScrollView, Text, View } from "react-native";
import { X } from "lucide-react-native";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /**
   * Max width of the sheet on larger screens (tablets, web). Accepts a
   * Tailwind class such as "max-w-2xl". Ignored on phones, where the sheet
   * is already full width.
   */
  className?: string;
}

/**
 * Centered modal sheet. Uses React Native's Modal, which handles the Android
 * back button (via onRequestClose) and the dimmed backdrop. Escape-to-close
 * from the web version is covered by onRequestClose on web.
 */
export function Modal({ open, onClose, title, description, children, className = "" }: ModalProps) {
  return (
    <RNModal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-start bg-black/40 px-4 pb-6 pt-16 sm:pt-24">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Dismiss" />

        <View
          className={`w-full max-h-[90%] gap-4 rounded-2xl border border-border bg-surface p-5 shadow-lg   ${className}`}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="font-heading text-lg font-semibold text-text-primary ">
                {title}
              </Text>
              {description ? (
                <Text className="text-xs text-text-primary/60 ">{description}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="shrink-0 rounded-full p-1.5 active:opacity-70"
            >
              <X size={16} className="text-text-primary/50 " />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4">
            {children}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}