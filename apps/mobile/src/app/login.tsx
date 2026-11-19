// apps/mobile/src/app/login.tsx
import * as React from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Link, Redirect, useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { mobileAuth } from "../lib/api/auth";
import { useSessionStore } from "../store/session-store";

export default function LoginScreen() {
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const hydrated = useSessionStore((s) => s.hydrated);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  if (!hydrated) return null;
  if (userId) return <Redirect href="/onboarding/role" />;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const { user } = await mobileAuth.signIn(email.trim(), password);
      if (!user) throw new Error("Login failed. Try again.");
      // SessionProvider hydrates from SIGNED_IN; redirect once the store has the user.
      router.replace("/onboarding/role");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log in. Check your details.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to continue.</Text>

        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={styles.input}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              style={[styles.input, { flex: 1, paddingRight: 40 }]}
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
              style={styles.eyeButton}
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            >
                {showPassword ? <EyeOff size={18} color="#6b6b6b" /> : <Eye size={18} color="#6b6b6b" />}            </Pressable>
          </View>
          <Link href="/forgot-password">
            <Text style={styles.link}>Forgot password?</Text>
          </Link>
        </View>

        {error ? <Text style={styles.errorBox}>{error}</Text> : null}

        <Pressable onPress={handleSubmit} disabled={!canSubmit} style={[styles.primaryButton, !canSubmit && styles.disabled]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Log in</Text>}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.muted}>Don't have an account? </Text>
          <Link href="/signup">
            <Text style={styles.link}>Sign up</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#faf7f2", justifyContent: "center", padding: 20 },
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
  errorBox: { fontSize: 13, color: "#b3392f", backgroundColor: "#fbeceb", padding: 10, borderRadius: 8 },
  primaryButton: { backgroundColor: "#7a1f3d", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  footerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  muted: { fontSize: 13, color: "#6b6b6b" },
  link: { fontSize: 13, fontWeight: "600", color: "#7a1f3d" },
});