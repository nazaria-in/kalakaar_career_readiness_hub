// apps/mobile/src/app/onboarding/not-approved.tsx
import * as React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { mobileAuth } from "../../lib/api/auth";
import { fetchMyApprovalStatus } from "../../lib/api/users";
import { useSessionStore } from "../../store/session-store";

export default function NotApprovedScreen() {
  const router = useRouter();
  const hydrated = useSessionStore((s) => s.hydrated);
  const userId = useSessionStore((s) => s.userId);
  const setApprovalStatus = useSessionStore((s) => s.setApprovalStatus);

  const [checking, setChecking] = React.useState(true);
  const [failed, setFailed] = React.useState(false);

  const check = React.useCallback(async () => {
    if (!userId) return;
    setChecking(true);
    setFailed(false);
    try {
      const status = await fetchMyApprovalStatus(userId);
      setApprovalStatus(status);
      // If approved, the gate sends the user to profile or dashboard
    } catch {
      setFailed(true);
    } finally {
      setChecking(false);
    }
  }, [userId, setApprovalStatus]);

  React.useEffect(() => {
    if (hydrated && userId) void check();
  }, [hydrated, userId, check]);

  if (!hydrated) {
    return (
      <View className="flex-1 bg-[#faf7f2] items-center justify-center p-6">
        <ActivityIndicator />
      </View>
    );
  }
  if (!userId) return <Redirect href="/login" />;

  async function handleSignOut() {
    await mobileAuth.signOut().catch(() => undefined);
    router.replace("/login");
  }

  return (
    <View className="flex-1 bg-[#faf7f2] items-center justify-center p-6">
      <View className="w-full max-w-[400px] bg-white rounded-2xl border border-[#e5e0d8] p-6 gap-3.5 items-center">
        <Text className="text-lg font-semibold text-[#1f1f1f]">
          {checking ? "Checking your status…" : "Awaiting approval"}
        </Text>
        <Text className="text-sm leading-5 text-[#6b6b6b] text-center">
          {failed
            ? "We couldn't check your approval status just now. Try again, or sign out and back in."
            : "Your account is being reviewed. A program manager will approve you soon. Check back shortly."}
        </Text>

        <Pressable
          onPress={check}
          disabled={checking}
          className={`bg-[#7a1f3d] rounded-full py-3 px-6 mt-2 ${checking ? "opacity-50" : ""}`}
        >
          <Text className="text-white text-sm font-semibold">Check again</Text>
        </Pressable>
        <Pressable
          onPress={handleSignOut}
          className="border border-[#9a9184] rounded-full py-2.5 px-6"
        >
          <Text className="text-[#1f1f1f] text-sm font-semibold">Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}