// apps/mobile/src/components/onboarding/OnboardingGate.tsx
import * as React from "react";
import { Redirect, type Href } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ONBOARDING_PATHS, resolveOnboardingStep, type OnboardingStep } from "@repo/shared";
import { useSessionStore } from "../../store/session-store";

/** Renders children only when the user belongs on `step`. Otherwise redirects to their real step. */
export function OnboardingGate({ step, children }: { step: OnboardingStep; children: React.ReactNode }) {
  const hydrated = useSessionStore((s) => s.hydrated);
  const userId = useSessionStore((s) => s.userId);
  const role = useSessionStore((s) => s.role);
  const approvalStatus = useSessionStore((s) => s.approvalStatus);
  const onboardingCompleted = useSessionStore((s) => s.onboardingCompleted);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const current = resolveOnboardingStep({ userId, role, approvalStatus, onboardingCompleted });
  if (current !== step) {
    return <Redirect href={ONBOARDING_PATHS[current] as Href} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#faf7f2" },
});