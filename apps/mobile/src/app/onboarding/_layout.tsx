// apps/mobile/src/app/onboarding/_layout.tsx
import { Stack, usePathname } from "expo-router";
import type { OnboardingStep } from "@repo/shared";
import { OnboardingGate } from "../../components/onboarding/OnboardingGate";

const STEP_BY_PATH: Record<string, OnboardingStep> = {
  "/onboarding/role": "role",
  "/onboarding/profile": "profile",
  "/onboarding/not-approved": "not-approved",
};

export default function OnboardingLayout() {
  const pathname = usePathname();
  // Any unknown path under /onboarding is treated as complete, so fully onboarded users go to the dashboard.
  const step = STEP_BY_PATH[pathname] ?? "complete";

  return (
    <OnboardingGate step={step}>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingGate>
  );
}