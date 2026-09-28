import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import {
  acceptCohortInvitation,
  getLearnerOnboarding,
  previewCohortInvitation,
  saveLearnerOnboardingProfile
} from "../api/client";

function invitationUnavailableMessage() {
  return "We could not verify this invitation for the signed-in account. Try the email address it was sent to, or ask TCM to send you a fresh link.";
}

function dateLabel(value, timezone) {
  if (!value) return "To be announced";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeZone: timezone || "Asia/Kolkata"
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleDateString();
  }
}

export default function LearnerOnboardingScreen({
  session,
  invitationToken,
  invalidInvitationLink = false,
  cohortId,
  onInvitationAccepted,
  onSwitchAccount,
  onClose,
  onFinish
}) {
  const { theme } = useTheme();
  const [stage, setStage] = useState(invitationToken ? "preview" : cohortId ? "profile" : "unavailable");
  const [activeCohortId, setActiveCohortId] = useState(cohortId || null);
  const [preview, setPreview] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [profile, setProfile] = useState({
    preferredName: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    language: "English",
    goal: "",
    experienceLevel: "beginner",
    communicationPreference: "both",
    profileVisibility: "private",
    showProgressToCohort: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let current = true;
    async function load() {
      if (!session?.token) return;
      if (invitationToken) {
        setStage("preview");
        setLoading(true);
        setError("");
        try {
          const result = await previewCohortInvitation(session.token, invitationToken);
          if (current) setPreview(result.preview);
        } catch (requestError) {
          if (current) {
            setPreview(null);
            setError(requestError.status === 404 ? invitationUnavailableMessage() : "We could not load this invitation. Check your connection and try again.");
          }
        } finally {
          if (current) setLoading(false);
        }
        return;
      }
      if (!activeCohortId) {
        setStage("unavailable");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const result = await getLearnerOnboarding(session.token, activeCohortId);
        if (!current) return;
        setOnboarding(result);
        setProfile((old) => ({ ...old, ...(result.onboarding?.profile || {}) }));
        setStage(result.onboarding?.status === "completed" ? "ready" : "profile");
      } catch (requestError) {
        if (current) setError(requestError.status === 404 ? "We could not find an onboarding step for this account. Reopen your invitation or contact your cohort instructor." : "Your saved onboarding could not be loaded. Check your connection and retry.");
      } finally {
        if (current) setLoading(false);
      }
    }
    load();
    return () => { current = false; };
  }, [session?.token, invitationToken, activeCohortId]);

  async function handleAcceptInvitation() {
    if (!session?.token || !invitationToken) return;
    setAccepting(true);
    setError("");
    try {
      const result = await acceptCohortInvitation(session.token, invitationToken);
      const acceptedCohortId = String(result.cohortId);
      setActiveCohortId(acceptedCohortId);
      if (onInvitationAccepted) await onInvitationAccepted(acceptedCohortId);
      const state = await getLearnerOnboarding(session.token, acceptedCohortId);
      setOnboarding(state);
      setProfile((old) => ({ ...old, ...(state.onboarding?.profile || {}) }));
      setStage(state.onboarding?.status === "completed" ? "ready" : "profile");
    } catch (requestError) {
      setError(requestError.status === 404 ? invitationUnavailableMessage() : "We could not accept this invitation right now. Your link has not been saved by this app; retry while this page is open or reopen the original email link.");
    } finally {
      setAccepting(false);
    }
  }

  function updateProfile(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  async function handleSaveProfile() {
    if (!profile.preferredName.trim() || !profile.timezone.trim() || !profile.language.trim() || !profile.experienceLevel) {
      setError("Please add your preferred name, timezone, language, and experience level before continuing.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await saveLearnerOnboardingProfile(session.token, activeCohortId, profile);
      setProfile((current) => ({ ...current, ...(result.profile || {}) }));
      setNotice("Your private learning profile is saved. You can return and continue later.");
      setStage("consent");
    } catch (requestError) {
      setError(requestError.message || "We could not save your profile. Your entries are still on this screen; retry when your connection is ready.");
    } finally {
      setSaving(false);
    }
  }

  const styles = makeStyles(theme);
  const unavailable = invalidInvitationLink || stage === "unavailable";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Return to TCM" onPress={onClose} style={styles.backButton}>
            <Feather name="arrow-left" size={19} color={theme.text} />
          </Pressable>
          <Text style={styles.brand}>TCM One</Text>
          <Text style={styles.stepLabel}>{stage === "preview" ? "Invitation" : stage === "profile" ? "Your profile" : stage === "consent" ? "Review" : "Welcome"}</Text>
        </View>

        {loading ? (
          <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel="Loading your invitation">
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.body}>Loading your private onboarding…</Text>
          </View>
        ) : unavailable ? (
          <View style={styles.card}>
            <View style={styles.iconCircle}><Feather name="link-2" size={22} color="#B45309" /></View>
            <Text style={styles.title}>This invitation needs attention</Text>
            <Text style={styles.body}>{error || invitationUnavailableMessage()}</Text>
            {session?.token ? <ActionButton label="Switch account" onPress={onSwitchAccount} styles={styles} /> : null}
          </View>
        ) : stage === "preview" ? (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>YOUR INVITATION</Text>
            <Text style={styles.title}>{preview?.title || "Review your cohort"}</Text>
            <Text style={styles.body}>{preview?.description || "You have been invited to join a TCM One learning cohort."}</Text>
            {preview?.course ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{preview.course.title}</Text>
                {!!preview.course.subtitle && <Text style={styles.body}>{preview.course.subtitle}</Text>}
                {!!preview.course.description && <Text style={styles.body}>{preview.course.description}</Text>}
                <Text style={styles.meta}>{[preview.course.level, preview.course.duration, preview.course.language].filter(Boolean).join(" · ")}</Text>
              </View>
            ) : null}
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Dates</Text><Text style={styles.detailValue}>{dateLabel(preview?.startsAt, preview?.timezone)} – {dateLabel(preview?.endsAt, preview?.timezone)}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Timezone</Text><Text style={styles.detailValue}>{preview?.timezone || "Asia/Kolkata"}</Text></View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your instructors</Text>
              <Text style={styles.body}>{preview?.instructors?.length ? preview.instructors.map((item) => item.name).filter(Boolean).join(", ") : "Your instructor team will be shown here."}</Text>
            </View>
            <View style={styles.privacyNotice}>
              <Feather name="lock" size={16} color={theme.primary} />
              <Text style={styles.noticeText}>Your invitation is private and is only accepted for the account email it was sent to. No class access is granted until onboarding is complete.</Text>
            </View>
            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
            <ActionButton label={accepting ? "Accepting…" : "Continue with this invitation"} onPress={handleAcceptInvitation} disabled={accepting || !preview} styles={styles} />
            <Pressable accessibilityRole="button" onPress={onSwitchAccount} style={styles.secondaryButton}><Text style={styles.secondaryText}>Use a different account</Text></Pressable>
          </View>
        ) : stage === "profile" ? (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>STEP 1 OF 2 · LEARNING PROFILE</Text>
            <Text style={styles.title}>Help your instructors support you</Text>
            <Text style={styles.body}>This information is for your learning plan. Your profile and progress stay private unless you choose otherwise.</Text>
            <Field label="Name you want us to use" value={profile.preferredName} onChangeText={(value) => updateProfile("preferredName", value)} placeholder="Preferred name" styles={styles} />
            <Field label="Timezone" value={profile.timezone} onChangeText={(value) => updateProfile("timezone", value)} placeholder="Asia/Kolkata" styles={styles} />
            <Field label="Language for learning support" value={profile.language} onChangeText={(value) => updateProfile("language", value)} placeholder="English, Hindi…" styles={styles} />
            <Text style={styles.fieldLabel}>Your experience so far</Text>
            <View style={styles.chipRow}>
              {["beginner", "some_experience", "experienced"].map((value) => (
                <Choice key={value} label={value === "some_experience" ? "Some experience" : value[0].toUpperCase() + value.slice(1)} selected={profile.experienceLevel === value} onPress={() => updateProfile("experienceLevel", value)} styles={styles} />
              ))}
            </View>
            <Field label="What would you like to achieve? (optional)" value={profile.goal} onChangeText={(value) => updateProfile("goal", value)} placeholder="Your learning goal" multiline styles={styles} />
            <Text style={styles.fieldLabel}>Who can see your profile?</Text>
            <View style={styles.chipRow}>
              <Choice label="Only me and my instructors" selected={profile.profileVisibility === "private"} onPress={() => updateProfile("profileVisibility", "private")} styles={styles} />
              <Choice label="Cohort members" selected={profile.profileVisibility === "cohort"} onPress={() => updateProfile("profileVisibility", "cohort")} styles={styles} />
            </View>
            <Text style={styles.meta}>Your profile starts private. Progress stays private by default.</Text>
            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
            {notice ? <Text style={styles.success} accessibilityRole="status">{notice}</Text> : null}
            <ActionButton label={saving ? "Saving…" : "Save and continue"} onPress={handleSaveProfile} disabled={saving} styles={styles} />
          </View>
        ) : stage === "consent" ? (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>STEP 2 OF 2 · REVIEW BEFORE ACTIVATION</Text>
            <Text style={styles.title}>Your profile is saved</Text>
            <Text style={styles.body}>Before we activate your cohort access, you must be able to read the current learner terms, privacy notice, and safe-lab rules. We will show and record the exact document versions below.</Text>
            <VersionRow label="Learner terms" version={onboarding?.onboarding?.consents?.terms?.version} styles={styles} />
            <VersionRow label="Privacy notice" version={onboarding?.onboarding?.consents?.privacy?.version} styles={styles} />
            <VersionRow label="Cybersecurity safe-lab rules" version={onboarding?.onboarding?.consents?.safeLab?.version} styles={styles} />
            <VersionRow label="Age confirmation" version={onboarding?.onboarding?.consents?.adultConfirmation?.version} styles={styles} />
            <View style={styles.warningNotice}>
              <Feather name="info" size={17} color="#92400E" />
              <Text style={styles.warningText}>The matching learner-facing documents have not yet been published for review. Your access remains inactive, and we will not record consent until you can read each document.</Text>
            </View>
            <Text style={styles.body}>This pilot currently accepts learners who are 18 or older. A guardian-consent path is not available.</Text>
            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
            <Pressable accessibilityRole="button" onPress={() => setStage("profile")} style={styles.secondaryButton}><Text style={styles.secondaryText}>Review my saved profile</Text></Pressable>
          </View>
        ) : stage === "ready" ? (
          <View style={styles.card}>
            <View style={styles.iconCircle}><Feather name="check" size={22} color="#047857" /></View>
            <Text style={styles.title}>You are already onboarded</Text>
            <Text style={styles.body}>Your cohort access is active. Continue to TCM One to see your learning space.</Text>
            <ActionButton label="Continue to TCM One" onPress={onFinish || onClose} styles={styles} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>We could not find an invitation</Text>
            <Text style={styles.body}>Open the original invitation link again or ask your instructor to resend it.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, styles, multiline = false, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...props} accessibilityLabel={label} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} style={[styles.input, multiline && styles.multiline]} />
    </View>
  );
}

function Choice({ label, selected, onPress, styles }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function VersionRow({ label, version, styles }) {
  return (
    <View style={styles.versionRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.versionText}>{version || "Unavailable"}</Text>
    </View>
  );
}

function ActionButton({ label, onPress, disabled = false, styles }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && styles.disabledButton]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flexGrow: 1, width: "100%", maxWidth: 720, alignSelf: "center", padding: 20, paddingBottom: 40 },
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
    brand: { color: theme.text, fontSize: 16, fontWeight: "800", flex: 1 },
    stepLabel: { color: theme.subtext, fontSize: 12, fontWeight: "600" },
    card: { backgroundColor: theme.cardBg, borderColor: theme.border, borderWidth: 1, borderRadius: 20, padding: 20, gap: 14 },
    loading: { flex: 1, minHeight: 280, alignItems: "center", justifyContent: "center", gap: 12 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.badgeBg, alignItems: "center", justifyContent: "center" },
    eyebrow: { color: theme.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
    title: { color: theme.text, fontSize: 24, lineHeight: 32, fontWeight: "800" },
    body: { color: theme.subtext, fontSize: 14, lineHeight: 22 },
    section: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 14, gap: 6 },
    sectionTitle: { color: theme.text, fontSize: 15, fontWeight: "700" },
    detailRow: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, flexDirection: "row", justifyContent: "space-between", gap: 14 },
    detailLabel: { color: theme.subtext, fontSize: 12, fontWeight: "600" },
    detailValue: { color: theme.text, fontSize: 12, fontWeight: "600", flexShrink: 1, textAlign: "right" },
    meta: { color: theme.subtext, fontSize: 12, lineHeight: 18 },
    privacyNotice: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, backgroundColor: theme.badgeBg },
    noticeText: { color: theme.text, fontSize: 12, lineHeight: 18, flex: 1 },
    warningNotice: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, backgroundColor: theme.isDark ? "#3A2E18" : "#FFFBEB", borderWidth: 1, borderColor: theme.isDark ? "#6B4F1D" : "#FDE68A" },
    warningText: { color: theme.isDark ? "#FDE68A" : "#78350F", fontSize: 13, lineHeight: 20, flex: 1 },
    primaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", marginTop: 2 },
    disabledButton: { opacity: 0.55 },
    primaryButtonText: { color: theme.isDark ? "#07130E" : "#FFFFFF", fontSize: 14, fontWeight: "800" },
    secondaryButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
    secondaryText: { color: theme.primary, fontSize: 13, fontWeight: "700" },
    error: { color: "#B91C1C", fontSize: 13, lineHeight: 20 },
    success: { color: "#047857", fontSize: 13, lineHeight: 20 },
    fieldWrap: { gap: 6 },
    fieldLabel: { color: theme.text, fontSize: 13, fontWeight: "700" },
    input: { minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, color: theme.text, paddingHorizontal: 12, fontSize: 14 },
    multiline: { minHeight: 96, paddingTop: 12 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    choice: { minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 13, justifyContent: "center", backgroundColor: theme.bg },
    choiceSelected: { borderColor: theme.primary, backgroundColor: theme.badgeBg },
    choiceText: { color: theme.subtext, fontSize: 12, fontWeight: "600" },
    choiceTextSelected: { color: theme.text },
    versionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 10 },
    versionText: { color: theme.text, fontSize: 11, fontWeight: "600", flexShrink: 1, textAlign: "right" }
  });
}
