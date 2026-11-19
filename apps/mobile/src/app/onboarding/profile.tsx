// apps/mobile/src/app/onboarding/profile.tsx
import * as React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Redirect } from "expo-router";
import { updateMyProfile } from "../../lib/api/users";
import { useSessionStore } from "../../store/session-store";

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const INPUT_CLASS =
  "border border-[#d4cbbd] rounded-[10px] px-3 py-2.5 text-sm text-[#1f1f1f] bg-white";
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[96px] align-top`;

export default function OnboardingProfileScreen() {
  const hydrated = useSessionStore((s) => s.hydrated);
  const userId = useSessionStore((s) => s.userId);
  const fullName = useSessionStore((s) => s.fullName);

  const [bio, setBio] = React.useState("");
  const [background, setBackground] = React.useState("");
  const [school, setSchool] = React.useState("");
  const [goals, setGoals] = React.useState("");
  const [interests, setInterests] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-[#faf7f2]">
        <ActivityIndicator />
      </View>
    );
  }
  if (!userId) return <Redirect href="/login" />;

  async function handleSubmit() {
    if (!userId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateMyProfile({
        userId,
        fullName: fullName || undefined,
        bio: bio.trim(),
        backgroundNotes: background.trim(),
        goals: splitList(goals),
        interests: splitList(interests),
        schoolOrOrg: school.trim(),
        markOnboardingComplete: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your profile. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-[#faf7f2]"
      contentContainerClassName="p-5 items-center"
      keyboardShouldPersistTaps="handled"
    >
      <View className="w-full max-w-[480px] bg-white rounded-2xl border border-[#e5e0d8] p-6 gap-4">
        <Text className="text-lg font-semibold text-[#1f1f1f]">Tell us about yourself</Text>
        <Text className="text-[13px] text-[#6b6b6b] -mt-2">
          This helps your mentor understand where you're coming from.
        </Text>

        <Field label="Bio" optional>
          <TextInput
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="A couple sentences about who you are."
            placeholderTextColor="#9a9184"
            className={TEXTAREA_CLASS}
          />
        </Field>

        <Field label="Background" optional>
          <TextInput
            value={background}
            onChangeText={setBackground}
            multiline
            placeholder="Relevant experience, skills, or context."
            placeholderTextColor="#9a9184"
            className={TEXTAREA_CLASS}
          />
        </Field>

        <Field label="School or organization" optional>
          <TextInput value={school} onChangeText={setSchool} className={INPUT_CLASS} />
        </Field>

        <Field label="Goals" optional hint="Comma-separated">
          <TextInput
            value={goals}
            onChangeText={setGoals}
            placeholder="Learn video editing, build a portfolio"
            placeholderTextColor="#9a9184"
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Interests" optional hint="Comma-separated">
          <TextInput
            value={interests}
            onChangeText={setInterests}
            placeholder="Photography, documentary film"
            placeholderTextColor="#9a9184"
            className={INPUT_CLASS}
          />
        </Field>

        {error && <Text className="text-[13px] text-[#b3392f]">{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className={`bg-[#7a1f3d] rounded-full py-3.5 items-center ${submitting ? "opacity-50" : ""}`}
        >
          <Text className="text-white text-sm font-semibold">
            {submitting ? "Saving…" : "Finish setup"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <View className="flex-row justify-between items-baseline">
        <Text className="text-[13px] font-semibold text-[#1f1f1f]">
          {label}
          {optional ? <Text className="font-normal text-[#9a9184]"> (optional)</Text> : null}
        </Text>
        {hint ? <Text className="text-[11px] text-[#9a9184]">{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}