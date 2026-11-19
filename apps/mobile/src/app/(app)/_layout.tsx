// apps/mobile/src/app/(app)/_layout.tsx
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  CalendarDays,
  ClipboardCheck,
  LayoutGrid,
  ListChecks,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import {
  NAV_BY_PERMISSION,
  NAV_IDS,
  NAV_LABELS,
  ROLES_REQUIRING_APPROVAL,
  type NavId,
} from "@repo/shared";
import { useRole } from "@/providers/role-provider";
import { useSessionStore } from "@/store/session-store";

// Nazaria palette. Keep these in sync with tailwind.config.js.
const COLORS = {
  burgundy: "#892d3b",
  teal: "#00504f",
  white: "#ffffff",
  inactive: "#6b7a79",
  headerText: "#00504f",
  background: "#faf7f2",
  tabBorder: "#d7e6e4",
} as const;

const ICONS: Record<NavId, LucideIcon> = {
  dashboard: LayoutGrid,
  assignments_and_courses: ClipboardCheck,
  meetings: CalendarDays,
  "exit-surveys": ListChecks,
  people: Users,
};

// Must match the file names in this (app) folder.
const ROUTE_NAME: Record<NavId, string> = {
  dashboard: "dashboard",
  assignments_and_courses: "assignments_and_courses",
  meetings: "meetings",
  "exit-surveys": "exit-survey",
  people: "people",
};

// Routes that exist in this folder but should never appear as tabs.
// Each name must be unique, and must not repeat any name in ROUTE_NAME.
const HIDDEN_ROUTES = ["assignments_and_courses/[id]"] as const;

export default function AppLayout() {
  // Read the store directly. RoleProvider reports isAuthenticated only when a
  // role exists, so it can't tell "no role yet" apart from "signed out".
  const hydrated = useSessionStore((s) => s.hydrated);
  const userId = useSessionStore((s) => s.userId);
  const sessionRole = useSessionStore((s) => s.role);
  const approvalStatus = useSessionStore((s) => s.approvalStatus);
  const { permissionLevel } = useRole();

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.burgundy} />
      </View>
    );
  }

  if (!userId) return <Redirect href="/login" />;
  if (!sessionRole) return <Redirect href="/onboarding/role" />;
  if (ROLES_REQUIRING_APPROVAL.includes(sessionRole) && approvalStatus !== "approved") {
    return <Redirect href={"/onboarding/not-approved" as any} />;
  }

  const visible = new Set(NAV_BY_PERMISSION[permissionLevel]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.white },
        headerTitleStyle: { color: COLORS.headerText, fontWeight: "600" },
        headerTintColor: COLORS.burgundy,
        headerShadowVisible: false,
        tabBarActiveTintColor: COLORS.burgundy,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.tabBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        sceneStyle: { backgroundColor: COLORS.background },
      }}
    >
      {NAV_IDS.map((id) => {
        const Icon = ICONS[id];
        return (
          <Tabs.Screen
            key={id}
            name={ROUTE_NAME[id]}
            options={{
              title: NAV_LABELS[id],
              tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />,
              // Hides the tab for roles that shouldn't see it.
              ...(visible.has(id) ? {} : { href: null }),
            }}
          />
        );
      })}

      {HIDDEN_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
});