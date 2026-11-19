// apps/mobile/src/app/signup.tsx
import * as React from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, Redirect, useRouter } from "expo-router";
import { Eye, EyeOff, Check, X } from "lucide-react-native";
import { getPasswordStrength, passwordsMatch, PASSWORD_CHECKS } from "@repo/shared";
import { mobileAuth } from "../lib/api/auth";
import { useSessionStore } from "../store/session-store";

export default function SignupScreen() {
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const hydrated = useSessionStore((s) => s.hydrated);

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { isValid: passwordValid, passed, total } = getPasswordStrength(password);
  const matchOk = passwordsMatch(password, confirmPassword);
  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0 && passwordValid && matchOk && !submitting;
  const showMismatch = confirmPassword.length > 0 && !matchOk;

  if (!hydrated) return null;
  if (userId) return <Redirect href="/dashboard" />;

  async function handleSubmit() {
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await mobileAuth.signUp(fullName.trim(), email.trim(), password);
      router.push("/onboarding/role");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#faf7f2" }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join the Nazaria community.</Text>

          <Field label="Full name">
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Priya Sharma"
              autoComplete="name"
              style={styles.input}
            />
          </Field>

          <Field label="Email">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={styles.input}
            />
          </Field>

          <Field label="Password">
            <PasswordField value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            <StrengthMeter password={password} passed={passed} total={total} />
          </Field>

          <Field label="Confirm password">
            <PasswordField value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            {showMismatch ? <Text style={styles.error}>Passwords don't match.</Text> : null}
          </Field>

          {error ? <Text style={styles.errorBox}>{error}</Text> : null}

          <Pressable onPress={handleSubmit} disabled={!canSubmit} style={[styles.primaryButton, !canSubmit && styles.disabled]}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign up</Text>}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.muted}>Already have an account? </Text>
            <Link href="/login">
              <Text style={styles.link}>Log in</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function PasswordField({
  value,
  onChange,
  visible,
  onToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.passwordWrap}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="••••••••"
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoComplete="password-new"
        style={[styles.input, { flex: 1, paddingRight: 40 }]}
      />
      <Pressable onPress={onToggle} hitSlop={8} style={styles.eyeButton} accessibilityLabel={visible ? "Hide password" : "Show password"}>
        {visible ? <EyeOff size={18} color="#6b6b6b" /> : <Eye size={18} color="#6b6b6b" />}
      </Pressable>
    </View>
  );
}

function StrengthMeter({ password, passed, total }: { password: string; passed: number; total: number }) {
  const filled = password.length === 0 ? 0 : passed;
  return (
    <View style={{ gap: 8, marginTop: 6 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.strengthSegment, { backgroundColor: i < filled ? strengthColor(filled, total) : "#e5e0d8" }]} />
        ))}
      </View>
      {PASSWORD_CHECKS.map((check) => {
        const ok = password.length > 0 && check.test(password);
        return (
          <View key={check.id} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {ok ? <Check size={14} color="#7a1f3d" /> : <X size={14} color="#9a9184" />}
            <Text style={[styles.checkText, ok && { color: "#1f1f1f" }]}>{check.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function strengthColor(filled: number, total: number) {
  const ratio = filled / total;
  if (ratio < 0.4) return "#b3392f";
  if (ratio < 0.8) return "#e0b400";
  return "#7a1f3d";
}

const styles = StyleSheet.create({
  content: { padding: 20, flexGrow: 1, justifyContent: "center" },
  card: { backgroundColor: "#ffffff", borderRadius: 16, padding: 24, gap: 18, borderWidth: 1, borderColor: "#e5e0d8" },
  title: { fontSize: 20, fontWeight: "600", color: "#1f1f1f" },
  subtitle: { fontSize: 14, color: "#6b6b6b", marginTop: -10 },
  label: { fontSize: 14, fontWeight: "500", color: "#1f1f1f" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e0d8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1f1f1f",
    backgroundColor: "#faf7f2",
  },
  passwordWrap: { flexDirection: "row", alignItems: "center" },
  eyeButton: { position: "absolute", right: 12 },
  strengthSegment: { flex: 1, height: 6, borderRadius: 3 },
  checkText: { fontSize: 12, color: "#6b6b6b" },
  error: { fontSize: 12, color: "#b3392f" },
  errorBox: { fontSize: 13, color: "#b3392f", backgroundColor: "#fbeceb", padding: 10, borderRadius: 8 },
  primaryButton: { backgroundColor: "#7a1f3d", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  footerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  muted: { fontSize: 13, color: "#6b6b6b" },
  link: { fontSize: 13, fontWeight: "600", color: "#7a1f3d" },
});