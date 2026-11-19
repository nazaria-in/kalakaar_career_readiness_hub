// /components/filters/OptionSheet.tsx
import * as React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

export interface OptionSheetItem {
  key: string;
  label: string;
  active: boolean;
  onPress: () => void;
  /** Renders with destructive/muted styling, e.g. the "Any" option. */
  muted?: boolean;
  /** Optional trailing element, e.g. a check icon. */
  trailing?: React.ReactNode;
}

export interface OptionSheetProps {
  visible: boolean;
  onClose: () => void;
  items: OptionSheetItem[];
}

/**
 * Centered popover list used in place of web's absolutely positioned dropdowns.
 * The backdrop is a sibling Pressable, not a parent, so taps on the sheet do
 * not dismiss it.
 */
export function OptionSheet({ visible, onClose, items }: OptionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View className="w-full max-w-xs rounded-2xl border border-border bg-surface p-1.5 shadow-lg  ">
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: item.active }}
                className={`flex-row items-center justify-between rounded-lg px-3 py-2.5 active:opacity-70 ${
                  item.active ? "bg-primary " : ""
                }`}
              >
                <Text
                  className={`text-xs ${
                    item.active
                      ? "text-primary-foreground "
                      : item.muted
                      ? "text-text-primary/60 "
                      : "text-text-primary "
                  }`}
                >
                  {item.label}
                </Text>
                {item.trailing}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}