// /components/content/ContentItemCard.tsx

import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { BookOpen, ClipboardList, FileBox, MoreVertical, Pencil, Trash2 } from "lucide-react-native";
import type { ContentItemWithMeta } from "@repo/shared";

const TYPE_ICON = { assignment: ClipboardList, course: BookOpen, resource: FileBox } as const;

interface ContentItemCardProps {
  item: ContentItemWithMeta;
  href: string; // Expo router path string (e.g. `/(app)/content/[id]`)
  onEdit?: () => void;
  onDelete?: () => Promise<void> | void;
}

export function ContentItemCard({ item, href, onEdit, onDelete }: ContentItemCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const Icon = TYPE_ICON[item.content_type] || FileBox;

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  }

  return (
    <View className="surface-card relative flex flex-col gap-3 rounded-xl p-4 ">
      <Link href={href as any} asChild>
        <Pressable className="flex flex-col gap-2">
          <View className="flex flex-row items-start justify-between gap-2">
            <View className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent ">
              <Icon size={16} className="text-accent-foreground" />
            </View>
            {item.week && (
              <View className="rounded-full bg-card-alt px-2 py-0.5 ">
                <Text className="text-[11px] font-medium text-text-muted ">
                  {item.week.name}
                </Text>
              </View>
            )}
          </View>

          <Text className="font-heading text-base font-medium leading-snug text-text-primary ">
            {item.title || "Untitled"}
          </Text>

          {item.description && (
            <Text numberOfLines={2} className="text-sm text-text-muted ">
              {item.description}
            </Text>
          )}

          {item.tags && item.tags.length > 0 && (
            <View className="flex flex-row flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <View
                  key={tag.id}
                  className="rounded-full border border-border px-2 py-0.5 "
                >
                  <Text className="text-[11px] text-text-muted ">
                    {tag.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>
      </Link>

      {(onEdit || onDelete) && (
        <View className="absolute right-3 top-3 z-10">
          <Pressable
            accessibilityLabel="Item actions"
            onPress={() => setMenuOpen((o) => !o)}
            className="rounded-full bg-card p-1.5 "
          >
            <MoreVertical size={16} className="text-text-muted" />
          </Pressable>

          {menuOpen && (
            <View className="surface-card-strong absolute right-0 top-9 z-20 flex w-36 flex-col gap-1 rounded-lg p-1.5 shadow-md ">
              {onEdit && (
                <Pressable
                  onPress={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="flex flex-row items-center gap-2 rounded-lg px-2 py-1.5 active:bg-card-alt "
                >
                  <Pencil size={14} className="text-text-primary" />
                  <Text className="text-xs text-text-primary ">Edit</Text>
                </Pressable>
              )}
              {onDelete && (
                <Pressable
                  disabled={deleting}
                  onPress={handleDelete}
                  className="flex flex-row items-center gap-2 rounded-lg px-2 py-1.5 active:bg-card-alt disabled:opacity-50 "
                >
                  {deleting ? (
                    <ActivityIndicator size="small" className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <Trash2 size={14} className="text-destructive" />
                  )}
                  <Text className="text-xs text-destructive ">
                    {deleting ? "Deleting…" : "Delete"}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}