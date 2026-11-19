// /components/admin/RoleBadge.tsx
import { UserRole } from "@repo/shared";
import { Text, View } from "react-native";

// Distinct color per role so mentee/mentor are never ambiguous in a list.
// This is the "clearly visible who is mentee/mentor" requirement.
const ROLE_STYLES: Record<UserRole, { container: string; text: string }> = {
  mentee: {
    container: "bg-nazaria-pale-teal ",
    text: "text-nazaria-teal ",
  },
  mentor: {
    container: "bg-nazaria-pale-pink ",
    text: "text-nazaria-burgundy ",
  },
  associate: {
    container: "bg-nazaria-pale-gold ",
    text: "text-text-primary ",
  },
  pm: {
    container: "bg-accent ",
    text: "text-accent-foreground ",
  },
};

const ROLE_LABELS: Record<UserRole, string> = {
  mentee: "Mentee",
  mentor: "Mentor",
  associate: "Associate",
  pm: "P.M",
};

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const styles = ROLE_STYLES[role];

  return (
    <View className={`w-fit self-start rounded-full px-2 py-0.5 ${styles.container}`}>
      <Text className={`text-xs font-medium ${styles.text}`}>{ROLE_LABELS[role]}</Text>
    </View>
  );
}