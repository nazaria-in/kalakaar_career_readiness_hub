// /components/shared/UserCard.tsx
import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { RoleBadge } from "@/components/admin/RoleBadge";
import { UserCardPerson } from "@repo/shared";


export interface UserCardProps {
  person: UserCardPerson;
  view: "list" | "card";
  /**
   * Whether the name is tappable and navigates to `/admin?id=<id>`. The card
   * doesn't decide this itself. The caller (always PeopleGrid) computes it from
   * the viewer's permission level + this person's role.
   */
  clickable: boolean;
  /** One action element: approve/reject buttons, a role dropdown, a team
   *  dropdown, a remove button, whatever the calling context needs.
   *  Ignored when `onToggleSelect` is set, because picker mode owns the action
   *  slot for its own remove-committed button instead (see PeopleGrid). */
  children?: React.ReactNode;
  /** Picker mode: shows a checkbox and puts the card in selection mode.
   *  When set, `onToggleSelect` fires on checkbox press AND on pressing
   *  the row itself. */
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Shows an "Already assigned" tag next to the name. This member has
   *  a committed relationship elsewhere (e.g. an existing
   *  mentee_assignments row) that removal must go through a warning for. */
  committed?: boolean;
  /** Navigation handler for the name when `clickable` is true. Wire this to
   *  your router, e.g. `() => router.push(\`/admin?id=${person.id}\`)`. */
  onPressName?: (personId: string) => void;
}

export function UserCard({
  person,
  view,
  clickable,
  children,
  selected = false,
  onToggleSelect,
  committed = false,
  onPressName,
}: UserCardProps) {
  const name = person.fullName ?? person.id;
  const isSelectable = onToggleSelect !== undefined;

  const nameEl = clickable ? (
    <Pressable
      onPress={() => onPressName?.(person.id)}
      accessibilityRole="link"
      accessibilityLabel={`Open ${name}`}
      hitSlop={4}
      className="active:opacity-70"
    >
      <Text className="font-medium text-text-primary underline-offset-2 ">
        {name}
      </Text>
    </Pressable>
  ) : (
    <Text className="font-medium text-text-primary ">{name}</Text>
  );

  const committedTag = committed ? (
    <View className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 ">
      <Text className="text-[10px] font-medium text-secondary-foreground ">
        Already assigned
      </Text>
    </View>
  ) : null;

  // Checkbox is a visual indicator only. The whole row handles the press,
  // so there is no nested touch target to stop propagation for.
  const checkbox = isSelectable ? (
    <View
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      className={`h-4 w-4 shrink-0 items-center justify-center rounded border ${
        selected
          ? "border-primary bg-primary  "
          : "border-border bg-card  "
      }`}
    >
      {selected ? (
        <Text className="text-[10px] font-bold text-primary-foreground ">✓</Text>
      ) : null}
    </View>
  ) : null;

  const rowPressProps = isSelectable
    ? {
        onPress: onToggleSelect,
        accessibilityRole: "button" as const,
        accessibilityState: { selected },
      }
    : {};

  if (view === "list") {
    return (
      <Pressable
        {...rowPressProps}
        disabled={!isSelectable}
        className={`flex-row items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5   ${
          isSelectable ? "active:opacity-70" : ""
        }`}
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          {checkbox}
          <RoleBadge role={person.role} />
          <View className="min-w-0 flex-1">
            {nameEl}
            <Text
              numberOfLines={1}
              className="text-xs text-text-muted "
            >
              {person.schoolOrOrg ?? "—"}
              {person.approvalStatus !== "approved" ? ` · ${person.approvalStatus}` : ""}
            </Text>
          </View>
        </View>
        {isSelectable ? (
          committedTag
        ) : children ? (
          <View className="shrink-0 flex-row items-center gap-2">{children}</View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      {...rowPressProps}
      disabled={!isSelectable}
      className={`gap-2 rounded-xl border border-border bg-card p-4   ${
        isSelectable ? "active:opacity-70" : ""
      }`}
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row items-start gap-2">
          {checkbox}
          <View className="min-w-0 flex-1">
            {nameEl}
            {person.schoolOrOrg ? (
              <Text numberOfLines={1} className="text-xs text-text-muted ">
                {person.schoolOrOrg}
              </Text>
            ) : null}
          </View>
        </View>
        <RoleBadge role={person.role} />
      </View>

      {person.approvalStatus !== "approved" ? (
        <Text className="text-xs text-text-muted ">{person.approvalStatus}</Text>
      ) : null}

      {isSelectable ? (
        committedTag ? <View className="pt-1 flex-row">{committedTag}</View> : null
      ) : children ? (
        <View className="flex-row flex-wrap items-center gap-2 pt-1">{children}</View>
      ) : null}
    </Pressable>
  );
}