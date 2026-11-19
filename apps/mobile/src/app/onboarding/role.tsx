// apps/mobile/src/app/onboarding/role.tsx
import * as React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { GraduationCap, ShieldCheck, Users, type LucideIcon } from "lucide-react-native";
import { ROLES_REQUIRING_APPROVAL, type UserRole } from "@repo/shared";
import { mobileAuth } from "../../lib/api/auth";
import { useSessionStore } from "../../store/session-store";

const ROLE_OPTIONS: { role: UserRole; title: string; description: string; icon: LucideIcon }[] = [
  {
    role: "mentee",
    title: "I'm a student",
    description: "Join a cohort, get assignments, and track your progress.",
    icon: GraduationCap,
  },
  {
    role: "mentor",
    title: "I want to mentor",
    description: "Apply to guide a team. Requires PM approval before you get access.",
    icon: Users,
  },
  {
    role: "associate",
    title: "I'm an associate",
    description: "Help run the program. Requires PM approval before you get access.",
    icon: ShieldCheck,
  },
];

export default function OnboardingRoleScreen() {
  const hydrated = useSessionStore((s) => s.hydrated);
  const userId = useSessionStore((s) => s.userId);
  const setRole = useSessionStore((s) => s.setRole);
  const setApprovalStatus = useSessionStore((s) => s.setApprovalStatus);

  const [selected, setSelected] = React.useState<UserRole | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!hydrated) {
    return (
      <View className="flex-1 bg-[#faf7f2] items-center justify-center p-5">
        <ActivityIndicator />
      </View>
    );
  }
  if (!userId) return <Redirect href="/login" />;

  async function handleContinue() {
    if (!selected || !userId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await mobileAuth.setRole(userId, selected);
      const needsApproval = ROLES_REQUIRING_APPROVAL.includes(selected);
      setApprovalStatus(needsApproval ? "pending" : "approved");
      setRole(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-[#faf7f2] items-center justify-center p-5">
      <View className="w-full max-w-[480px] bg-white rounded-2xl border border-[#e5e0d8] p-6 gap-3">
        <Text className="text-lg font-semibold text-[#1f1f1f]">How will you be joining?</Text>
        <Text className="text-[13px] text-[#6b6b6b] mb-1">
          You can't change this later without contacting your program manager.
        </Text>

        {ROLE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = selected === opt.role;
          return (
            <Pressable
              key={opt.role}
              disabled={submitting}
              onPress={() => setSelected(opt.role)}
              accessibilityState={{ selected: active }}
              className={`flex-row items-center gap-3 border rounded-xl p-3.5 ${
                active ? "border-[#7a1f3d] border-2 bg-[#faf7f2]" : "border-[#e5e0d8]"
              }`}
            >
              <View
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  active ? "bg-[#7a1f3d]" : "bg-[#f0e9df]"
                }`}
              >
                <Icon size={18} color={active ? "#ffffff" : "#7a1f3d"} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-sm font-semibold text-[#1f1f1f]">{opt.title}</Text>
                <Text className="text-xs leading-[17px] text-[#6b6b6b]">{opt.description}</Text>
              </View>
            </Pressable>
          );
        })}

        {error && <Text className="text-[13px] text-[#b3392f]">{error}</Text>}

        <Pressable
          disabled={!selected || submitting}
          onPress={handleContinue}
          className={`bg-[#7a1f3d] rounded-full py-3.5 items-center mt-2 ${
            !selected || submitting ? "opacity-50" : ""
          }`}
        >
          <Text className="text-white text-sm font-semibold">
            {submitting ? "Saving…" : "Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}