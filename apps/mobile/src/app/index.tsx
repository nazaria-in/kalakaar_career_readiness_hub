import * as React from "react";
import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { Link, Redirect } from "expo-router";
import { 
  FileText, 
  MessageSquare, 
  Users, 
  Compass, 
  Sparkles, 
  GraduationCap,
  LucideIcon 
} from "lucide-react-native";
import { useSessionStore } from "../store/session-store";

import { Card } from "@repo/ui";


type Audience = "mentee" | "mentor";

const AUDIENCE_COPY: Record<
  Audience,
  {
    eyebrow: string;
    headline: string;
    subhead: string;
    body: string;
    ctaLabel: string;
    ctaHref: "/signup" | "/login";
    features: { icon: LucideIcon; title: string; body: string }[];
  }
> = {
  mentee: {
    eyebrow: "For mentees",
    headline: "From Kalakar to creative professional.",
    subhead: "Your story doesn't end with a film. It begins with a career.",
    body: "You've already learnt to tell stories. Now it's time to learn how to work with clients, collaborate in teams, receive feedback, and build a career doing what you love. Every assignment, every conversation, and every piece of feedback brings you one step closer to becoming a professional storyteller.",
    ctaLabel: "Start this week's challenge",
    ctaHref: "/signup",
    features: [
      {
        icon: FileText,
        title: "Weekly assignments",
        body: "Structured briefs with clear submission slots, so you always know what's due and what's next.",
      },
      {
        icon: MessageSquare,
        title: "Real feedback, every week",
        body: "Your mentor reviews your work and leaves feedback you can act on before the next session.",
      },
      {
        icon: Users,
        title: "A team that has your back",
        body: "You're never learning alone — your team, your mentor, and the Nazaria team are one message away.",
      },
    ],
  },
  mentor: {
    eyebrow: "For mentors",
    headline: "Building a more inclusive media industry, one mentor at a time.",
    subhead:
      "When talented young people have access to guidance, opportunity, and encouragement, entire communities gain new storytellers.",
    body: "Thank you for mentoring with Nazaria and helping talented young people develop the confidence, professionalism, and resilience they need to thrive in the creative industry. This hub keeps your mentoring lightweight — track assignments, leave feedback, and flag a check-in in minutes.",
    ctaLabel: "Go to mentor dashboard",
    ctaHref: "/login",
    features: [
      {
        icon: Compass,
        title: "One place for every mentee",
        body: "See who's on track, who submitted late, and who needs a nudge — without digging through chats.",
      },
      {
        icon: FileText,
        title: "Review in context",
        body: "Every submission arrives next to the brief it answers, so feedback takes minutes, not meetings.",
      },
      {
        icon: Sparkles,
        title: "A two-minute exit check-in",
        body: "After every session, a short form turns your read on the meeting into a signal the Nazaria team can act on.",
      },
    ],
  },
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Get matched to a team",
    body: "Every mentee joins a small team with a dedicated mentor for the length of the cohort.",
  },
  {
    step: "02",
    title: "Do the work, get the feedback",
    body: "Weekly assignments come with submission slots and a review cycle — nothing sits unreviewed.",
  },
  {
    step: "03",
    title: "Build a career, not just a portfolio",
    body: "Progress compounds into industry-ready skills: communication, accountability, professionalism.",
  },
];

const SIGNALS = [
  { color: "#2f9e5c", label: "On track", body: "The session happened, the work is moving, no follow-up needed." },
  {
    color: "#e0b400",
    label: "Facing a few challenges",
    body: "Something's slowing things down — worth a mentor associate keeping an eye on it.",
  },
  {
    color: "#b3392f",
    label: "Needs a check-in",
    body: "The Nazaria team follows up directly — no one has to read every form to catch it.",
  },
];

export default function LandingScreen() {
  const userId = useSessionStore((s) => s.userId);
  const hydrated = useSessionStore((s) => s.hydrated);
  const [audience, setAudience] = React.useState<Audience>("mentee");
  const copy = AUDIENCE_COPY[audience];

  // Wait for session hydration, then send logged-in users straight to the dashboard.
  if (!hydrated) return null;
  if (userId) return <Redirect href="/dashboard" />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <Card title="Hello" description="Shared card test">
        <Card title="Nested" />
      </Card>
      <View style={styles.header}>
        <Text style={styles.brand}>Nazaria</Text>
        <Text style={styles.brandSub}>Kalkaaar Career Readiness Hub</Text>
        <View style={styles.navRow}>
          <Link href="/login" asChild>
            <Pressable style={styles.ghostButton}>
              <Text style={styles.ghostButtonText}>Log in</Text>
            </Pressable>
          </Link>
          <Link href="/signup" asChild>
            <Pressable style={styles.primaryButtonSmall}>
              <Text style={styles.primaryButtonText}>Get started</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Hero */}
      <View style={styles.card}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>KALAKAAR CAREER READINESS HUB</Text>
        </View>
        <Text style={styles.h1}>Your story doesn't end with a film.</Text>
        <Text style={[styles.h1, styles.accent]}>It begins with a career.</Text>
        <Text style={styles.lead}>
          You've already learnt to tell stories. Now learn to work with clients, collaborate in teams, take feedback, and
          build a career doing what you love — with your mentor, your peers, and the Nazaria team behind every step.
        </Text>
        <Link href="/signup" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Ready for this week's challenge? →</Text>
          </Pressable>
        </Link>
        <Link href="/login" asChild>
          <Pressable style={styles.outlineButton}>
            <GraduationCap size={16} color="#1f1f1f" />
            <Text style={styles.outlineButtonText}>I'm mentoring</Text>
          </Pressable>
        </Link>
      </View>

      {/* Signal card */}
      <View style={styles.card}>
        <Text style={styles.mutedCenter}>Every check-in becomes one signal</Text>
        {SIGNALS.map((s) => (
          <View key={s.label} style={styles.signalRow}>
            <View style={[styles.signalDot, { backgroundColor: s.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.signalLabel}>{s.label}</Text>
              <Text style={styles.muted}>{s.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Audience switch */}
      <View style={styles.segment}>
        {(Object.keys(AUDIENCE_COPY) as Audience[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setAudience(key)}
            accessibilityState={{ selected: audience === key }}
            style={[styles.segmentItem, audience === key && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, audience === key && styles.segmentTextActive]}>
              {key === "mentee" ? "I'm a mentee" : "I'm a mentor"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Audience copy */}
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
        <Text style={styles.h2}>{copy.headline}</Text>
        <Text style={styles.subhead}>{copy.subhead}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        <Link href={copy.ctaHref} asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{copy.ctaLabel} →</Text>
          </Pressable>
        </Link>
        {copy.features.map((f, index) => {
          const IconComponent = f.icon;
          return (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <IconComponent size={18} color="#7a1f3d" />
              </View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.muted}>{f.body}</Text>
            </View>
          );
        })}
      </View>

      {/* How it works */}
      <View style={styles.howSection}>
        <Text style={styles.h2}>How the cohort works</Text>
        {HOW_IT_WORKS.map((item) => (
          <View key={item.step} style={styles.howItem}>
            <Text style={styles.howStep}>{item.step}</Text>
            <Text style={styles.featureTitle}>{item.title}</Text>
            <Text style={styles.muted}>{item.body}</Text>
          </View>
        ))}
      </View>

      {/* Closing CTA */}
      <View style={styles.closing}>
        <Text style={[styles.h2, { textAlign: "center" }]}>
          Your mentor, your peers, and the Nazaria team are here for every step.
        </Text>
        <Link href="/signup" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Create your account →</Text>
          </Pressable>
        </Link>
        <Link href="/login" asChild>
          <Pressable style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>I already have an account</Text>
          </Pressable>
        </Link>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Nazaria Arts Foundation</Text>
        <Text style={styles.muted}>
          Shahid Pascal Colony, Shankarwadi, Jogeshwari (E){"\n"}Mumbai, Maharashtra 400060
        </Text>
        <Text style={styles.link}>us@nazariacollective.in</Text>
        <Text style={styles.footerCopy}>© Nazaria Arts Foundation {new Date().getFullYear()}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#faf7f2" },
  content: { padding: 20, gap: 20 },
  header: { gap: 4 },
  brand: { fontSize: 22, fontWeight: "600", color: "#1f1f1f" },
  brandSub: { fontSize: 13, color: "#6b6b6b" },
  navRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  card: { backgroundColor: "#ffffff", borderRadius: 16, padding: 20, gap: 12, borderWidth: 1, borderColor: "#e5e0d8" },
  pill: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#c9bfb2", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, color: "#7a1f3d" },
  h1: { fontSize: 28, fontWeight: "600", color: "#1f1f1f", lineHeight: 34 },
  h2: { fontSize: 20, fontWeight: "600", color: "#1f1f1f", lineHeight: 26 },
  accent: { color: "#7a1f3d" },
  lead: { fontSize: 15, lineHeight: 22, color: "#6b6b6b" },
  eyebrow: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, color: "#7a1f3d", textTransform: "uppercase" },
  subhead: { fontSize: 15, fontWeight: "500", color: "#6b6b6b" },
  body: { fontSize: 14, lineHeight: 21, color: "#6b6b6b" },
  muted: { fontSize: 13, lineHeight: 18, color: "#6b6b6b" },
  mutedCenter: { fontSize: 14, fontWeight: "500", color: "#6b6b6b", textAlign: "center" },
  link: { fontSize: 13, color: "#7a1f3d" },
  signalRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  signalDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  signalLabel: { fontSize: 14, fontWeight: "600", color: "#1f1f1f" },
  primaryButton: {
    backgroundColor: "#7a1f3d",
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  primaryButtonSmall: { backgroundColor: "#7a1f3d", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  ghostButton: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  ghostButtonText: { color: "#1f1f1f", fontSize: 14, fontWeight: "500" },
  outlineButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#9a9184",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  outlineButtonText: { color: "#1f1f1f", fontSize: 14, fontWeight: "600" },
  segment: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e0d8",
    padding: 4,
  },
  segmentItem: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 },
  segmentItemActive: { backgroundColor: "#7a1f3d" },
  segmentText: { fontSize: 13, fontWeight: "500", color: "#6b6b6b" },
  segmentTextActive: { color: "#ffffff" },
  featureCard: { backgroundColor: "#faf7f2", borderRadius: 12, padding: 14, gap: 6 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0e9df",
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { fontSize: 14, fontWeight: "600", color: "#1f1f1f" },
  howSection: { gap: 16, paddingVertical: 8 },
  howItem: { gap: 4 },
  howStep: { fontSize: 28, fontWeight: "600", color: "#d4cbbd" },
  closing: { gap: 14, alignItems: "stretch", paddingVertical: 12 },
  footer: { gap: 6, borderTopWidth: 1, borderColor: "#e5e0d8", paddingTop: 20 },
  footerTitle: { fontSize: 16, fontWeight: "600", color: "#1f1f1f" },
  footerCopy: { fontSize: 12, color: "#6b6b6b", marginTop: 8 },
});