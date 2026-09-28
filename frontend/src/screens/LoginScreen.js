import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Modal, NativeModules, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import Decorations from "../components/Decorations";
import TcmLogo from "../components/TcmLogo";
import { login, register, googleLogin, sendForgotPasswordOtp, verifyForgotPasswordOtp, resetPasswordWithOtp } from "../api/client";
import { colors, shadow } from "../constants/theme";
import { fonts } from "../constants/fonts";
import { useTheme } from "../context/ThemeContext";

WebBrowser.maybeCompleteAuthSession();

const roleOptions = [
  {
    key: "student",
    title: "Student",
    loginTitle: "Student Login",
    subtitle: "Learn & Grow",
    loginSubtitle: "Continue as a student",
    icon: "school",
    color: "#7357F6"
  },
  {
    key: "mentor",
    title: "Mentor",
    loginTitle: "Mentor Login",
    subtitle: "Teach & Inspire",
    loginSubtitle: "Continue as mentor",
    icon: "person",
    color: "#28A745"
  },
  {
    key: "partner",
    title: "Partner",
    loginTitle: "Partner Login",
    subtitle: "Institute Portal",
    loginSubtitle: "Login with Institute credentials",
    icon: "business",
    color: "#5B3CF5"
  }
];

function TcmOneBrandHeader({ compact = false }) {
  const { theme } = useTheme();
  const fontSize = compact ? 28 : 34;
  const lastColor = theme.isDark ? "#F8FAFC" : "#0F172A";
  const classColor = "#EF4444";

  return (
    <View style={{ alignItems: "center", marginBottom: compact ? 8 : 16 }}>
      <Image
        source={require("../../assets/icon.png")}
        style={{ width: compact ? 56 : 72, height: compact ? 56 : 72, marginBottom: 8, borderRadius: 14 }}
        resizeMode="contain"
      />
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text style={{ fontFamily: fonts.extraBold, fontSize, color: lastColor, letterSpacing: -0.2 }}>TCM </Text>
        <Text style={{ fontFamily: fonts.extraBold, fontSize, color: classColor, letterSpacing: -0.2, fontWeight: "900" }}>One</Text>
      </View>
      <Text style={{ fontFamily: fonts.semiBold, fontSize: compact ? 10 : 11, color: theme.subtext, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>
        Decoding The Mind
      </Text>
    </View>
  );
}

export default function LoginScreen({ onLogin, preserveInvitation = false }) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("student");
  const [mentorCategory, setMentorCategory] = useState("TCM One Information Tech");
  const [secure, setSecure] = useState(true);
  const [confirmSecure, setConfirmSecure] = useState(true);

  const mentorCategoryOptions = [
    { key: "TCM One Information Tech", label: "TCM One Information Tech", desc: "Coding, MERN, AI, DevOps", icon: "laptop-mac", color: "#5B3CF5" },
    { key: "TCM One Academy", label: "TCM One Academy", desc: "NEET, JEE, Boards", icon: "school", color: "#2E7D32" },
    { key: "TCM One Government", label: "TCM One Government", desc: "UPSC, SSC CGL, Banking, Railway", icon: "bank", color: "#2F79B9" }
  ];
  const [loading, setLoading] = useState(false);
  const googleSignInInFlight = useRef(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    referralCode: ""
  });

  // Password Reset OTP Modal States
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Email, 2 = OTP, 3 = New Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const compact = height < 740;
  const panelMaxWidth = Math.min(width - 24, 440);
  const activeRole = useMemo(() => roleOptions.find((item) => item.key === role) || roleOptions[0], [role]);
  const showGoogleSignIn = !(preserveInvitation && Platform.OS === "web");

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openSignup(nextRole = "student") {
    const selectedRole = preserveInvitation ? "student" : nextRole;
    setRole(selectedRole);
    setMode(selectedRole === "mentor" ? "mentor" : "signup");
  }

  useEffect(() => {
    try {
      if (NativeModules && NativeModules.RNGoogleSignin) {
        const { GoogleSignin } = require("@react-native-google-signin/google-signin");
        if (GoogleSignin && typeof GoogleSignin.configure === "function") {
          GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID || "1018503930810-nuht0vf2crgh0k5e5da65f6hb4g3p7qn.apps.googleusercontent.com",
            offlineAccess: true,
            forceCodeForRefreshToken: true
          });
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const hashStr = window.location.hash.substring(1) || window.location.search.substring(1);
    const params = new URLSearchParams(hashStr);
    const idToken = params.get("id_token");
    const accessToken = params.get("access_token");
    if (!idToken) {
      return;
    }

    (async () => {
      try {
        let googleUser = null;
        try {
          const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (userRes.ok) {
            googleUser = await userRes.json();
          }
        } catch (e) {}

        if ((!googleUser || !googleUser.email) && idToken) {
          try {
            if (idToken.includes(".")) {
              const base64Url = idToken.split(".")[1];
              const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split("")
                  .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                  .join("")
              );
              googleUser = JSON.parse(jsonPayload);
            }
          } catch (jwtErr) {}
        }

        if (googleUser && googleUser.email) {
          const session = await googleLogin(
            googleUser.email,
            googleUser.name || googleUser.given_name || "Google User",
            googleUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(googleUser.name || "Google User")}&background=4285F4&color=fff`,
            idToken,
            role
          );
          if (session) {
            onLogin(session);
          }
        }
      } catch (err) {
        console.log("Google web OAuth callback failed:", err);
      } finally {
        if (typeof window !== "undefined" && window.history) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
    })();
  }, []);

  async function handleGoogleSignIn() {
    if (googleSignInInFlight.current) {
      return;
    }
    googleSignInInFlight.current = true;
    setLoading(true);
    try {
      // Web: full-page redirect OAuth (never popups, never a fake account).
      if (Platform.OS === "web") {
        const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID || "1018503930810-nuht0vf2crgh0k5e5da65f6hb4g3p7qn.apps.googleusercontent.com";
        const redirectUri = window.location.origin;
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(webClientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=token%20id_token` +
          `&scope=${encodeURIComponent("openid profile email")}` +
          `&prompt=select_account` +
          `&nonce=${Math.random().toString(36).substring(2)}`;
        window.location.href = authUrl;
        return;
      }

      // 1. Try Native Google Sign-In sheet (Android / iOS native account picker)
      if (NativeModules && NativeModules.RNGoogleSignin) {
        try {
          const { GoogleSignin } = require("@react-native-google-signin/google-signin");
          if (GoogleSignin && typeof GoogleSignin.signIn === "function") {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            try {
              await GoogleSignin.signOut();
            } catch (e) {}

            const userInfo = await GoogleSignin.signIn();
            const userObj = userInfo.data?.user || userInfo.user;
            if (userObj && userObj.email) {
              const idToken = userInfo.data?.idToken || userInfo.idToken;
              if (!idToken) throw new Error("Google did not return a verified sign-in token. Please try again.");
              const session = await googleLogin(
                userObj.email,
                userObj.name || userObj.givenName || "Google User",
                userObj.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(userObj.name || "Google User")}&background=4285F4&color=fff`,
                idToken,
                role
              );
              onLogin(session);
              return;
            }
          }
        } catch (nativeErr) {
          console.log("Native GoogleSignin error/fallback:", nativeErr.message);
        }
      }

      // 2. Official Google OAuth Web Browser flow with prompt=select_account (no ExpoCryptoAES dependency)
      const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID || "1018503930810-nuht0vf2crgh0k5e5da65f6hb4g3p7qn.apps.googleusercontent.com";
      let redirectUri;
      if (typeof window !== "undefined" && window.location && window.location.origin) {
        redirectUri = window.location.origin;
      } else {
        redirectUri = AuthSession.makeRedirectUri();
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(webClientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token%20id_token` +
        `&scope=${encodeURIComponent("openid profile email")}` +
        `&prompt=select_account` +
        `&nonce=${Math.random().toString(36).substring(2)}`;

      let result = null;
      try {
        result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      } catch (browserErr) {
        console.log("WebBrowser openAuthSessionAsync error:", browserErr.message);
      }

      if (result && result.type === "success" && result.url) {
        const hash = result.url.split("#")[1] || result.url.split("?")[1] || "";
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const idToken = params.get("id_token");

        if (idToken) {
          try {
            const userRes = accessToken ? await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` }
            }) : null;
            const googleUser = userRes?.ok ? await userRes.json() : {};

            if (googleUser && (googleUser.email || idToken)) {
              const session = await googleLogin(
                googleUser.email || "",
                googleUser.name || googleUser.given_name || "Google User",
                googleUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(googleUser.name || "Google User")}&background=4285F4&color=fff`,
                idToken,
                role
              );
              onLogin(session);
              return;
            }
          } catch (e) {}
        }
      }

      if (result && result.type === "dismiss") {
        return; // User dismissed Google sign-in prompt
      }

      throw new Error("Google sign-in did not complete. Please try again or use your email and password.");
    } catch (error) {
      Alert.alert("Google Sign-In", error.message || "Could not complete Google Sign-In.");
    } finally {
      googleSignInInFlight.current = false;
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (!forgotEmail.trim()) {
      Alert.alert("Email required", "Please enter your registered email address.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await sendForgotPasswordOtp(forgotEmail.trim());
      setForgotStep(2);
      Alert.alert("OTP Sent 📩", res.message || `Verification OTP sent to ${forgotEmail.trim()}. Please check your email inbox.`);
    } catch (err) {
      Alert.alert("Error", err.message || "Could not send OTP.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!forgotOtp.trim()) {
      Alert.alert("OTP required", "Please enter the 6-digit OTP code.");
      return;
    }
    setForgotLoading(true);
    try {
      await verifyForgotPasswordOtp(forgotEmail.trim(), forgotOtp.trim());
      setForgotStep(3);
    } catch (err) {
      Alert.alert("Verification Failed", err.message || "Invalid OTP code.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Invalid Password", "Password must be at least 6 characters long.");
      return;
    }
    setForgotLoading(true);
    try {
      await resetPasswordWithOtp(forgotEmail.trim(), forgotOtp.trim(), newPassword);
      Alert.alert("Success", "Your password has been reset successfully. Please log in with your new password.");
      setForgotModalOpen(false);
      setForgotStep(1);
      setForgotEmail("");
      setForgotOtp("");
      setNewPassword("");
    } catch (err) {
      Alert.alert("Reset Failed", err.message || "Could not reset password.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function submitLogin() {
    if (!form.email.trim() || !form.password) {
      Alert.alert("Missing credentials", "Please enter both email address and password.");
      return;
    }
    setLoading(true);
    try {
      const session = await login(form.email.trim(), form.password);
      if (session && session.token) {
        onLogin(session);
      } else {
        Alert.alert("Login Failed", "Invalid response received from server.");
      }
    } catch (error) {
      Alert.alert("Login Failed", error.message || "Could not log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function submitSignup() {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      Alert.alert("Missing details", "Please fill in name, email, and password.");
      return;
    }

    if (form.confirmPassword && form.password !== form.confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const session = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: preserveInvitation ? "student" : mode === "mentor" ? "mentor" : role,
        mentorCategory,
        referralCode: form.referralCode ? form.referralCode.trim().toUpperCase() : ""
      });
      if (session && session.token) {
        onLogin(session);
      } else {
        Alert.alert("Signup Failed", "Could not complete account creation.");
      }
    } catch (error) {
      Alert.alert("Signup Failed", error.message || "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  if (mode !== "login") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
        <ScrollView
          contentContainerStyle={[styles.authScroll, { minHeight: height + 1 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Decorations />
          <Pressable hitSlop={12} onPress={() => setMode("login")} style={styles.backButton}>
            <Feather name="chevron-left" size={24} color={theme.text} />
          </Pressable>

          <View style={[styles.signupWrap, { backgroundColor: theme.cardBg, borderColor: theme.border, borderWidth: 1, borderRadius: 20, padding: 18, maxWidth: panelMaxWidth }]}>
            <TcmOneBrandHeader compact />
            <Text style={[styles.signupTitle, { color: theme.text }]}>{mode === "mentor" ? "Mentor Sign Up" : "Create Your Account"}</Text>
            <Text style={[styles.signupSub, { color: theme.subtext }]}>
              {mode === "mentor" ? "Join as a mentor and inspire the future" : "Join TCM One and start your learning journey"}
            </Text>

            {mode === "mentor" ? <MentorIntro /> : preserveInvitation ? (
              <Text style={[styles.subheading, { color: theme.subtext }]}>This invitation creates a learner account so your cohort access is assigned correctly.</Text>
            ) : <RoleTabs role={role} setRole={setRole} setMode={setMode} />}

            <Text style={[styles.blockTitle, { color: theme.text }]}>{mode === "mentor" ? "Select Your Specialization Category:" : ""}</Text>
            {mode === "mentor" ? (
              <View style={{ marginBottom: 14, marginTop: 4 }}>
                {mentorCategoryOptions.map((cat) => {
                  const selected = mentorCategory === cat.key;
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => setMentorCategory(cat.key)}
                      style={[
                        styles.mentorCatChoiceCard,
                        { backgroundColor: theme.cardBg, borderColor: theme.border },
                        selected && { borderColor: cat.color, backgroundColor: theme.badgeBg }
                      ]}
                    >
                      <View style={[styles.mentorCatIconWrap, { backgroundColor: selected ? cat.color : theme.badgeBg }]}>
                        <MaterialCommunityIcons name={cat.icon} size={18} color={selected ? "#FFFFFF" : cat.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.mentorCatTitle, { color: theme.text }, selected && { color: cat.color, fontFamily: fonts.bold }]}>
                          {cat.label}
                        </Text>
                        <Text style={[styles.mentorCatDesc, { color: theme.subtext }]}>{cat.desc}</Text>
                      </View>
                      {selected ? <Feather name="check-circle" size={16} color={cat.color} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Input icon="user" placeholder="Full Name" value={form.name} onChangeText={(value) => updateField("name", value)} />
            <Input
              autoCapitalize="none"
              icon="mail"
              keyboardType="email-address"
              placeholder="Email Address"
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
            />
            <Input
              icon="phone"
              keyboardType="phone-pad"
              leftExtra="+91"
              placeholder="Mobile Number"
              value={form.mobile}
              onChangeText={(value) => updateField("mobile", value)}
            />
            <Input
              icon="lock"
              placeholder="Create Password"
              secureTextEntry={secure}
              value={form.password}
              onChangeText={(value) => updateField("password", value)}
              rightIcon={secure ? "eye" : "eye-off"}
              onRightPress={() => setSecure((value) => !value)}
            />
            <Input
              icon="lock"
              placeholder="Confirm Password"
              secureTextEntry={confirmSecure}
              value={form.confirmPassword}
              onChangeText={(value) => updateField("confirmPassword", value)}
              rightIcon={confirmSecure ? "eye" : "eye-off"}
              onRightPress={() => setConfirmSecure((value) => !value)}
            />
            <Input
              icon="gift"
              placeholder="Referral Code (Optional, e.g. ANK25X)"
              value={form.referralCode}
              onChangeText={(value) => updateField("referralCode", value.toUpperCase())}
            />

            {mode === "signup" ? (
              <View style={styles.termsRow}>
                <Ionicons name="checkbox" size={17} color={theme.primary} />
                <Text style={[styles.termsText, { color: theme.text }]}>I agree to the Terms & Conditions and Privacy Policy</Text>
              </View>
            ) : null}

            <Pressable disabled={loading} onPress={submitSignup} style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>{loading ? "Please wait..." : mode === "mentor" ? "Continue" : "Sign Up"}</Text>
            </Pressable>

            {showGoogleSignIn ? (
              <>
                <Divider label="or sign up with" />
                <SocialRow onGooglePress={handleGoogleSignIn} />
              </>
            ) : (
              <Text style={[styles.subheading, { color: theme.subtext }]}>Use email and password for this invitation so it stays safely attached while you sign in.</Text>
            )}

            <Text style={[styles.switchText, { color: theme.subtext }]}>
              Already have an account?{" "}
              <Text onPress={() => setMode("login")} style={[styles.link, { color: theme.primary }]}>Login</Text>
            </Text>
          </View>
          <View style={styles.footerWave} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { minHeight: height + 1 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Decorations />
        <View style={[styles.hero, compact && styles.heroCompact]}>
          <TcmOneBrandHeader compact />
          <Text style={[styles.tagline, { color: theme.text }]}>
            Learn. Grow. Achieve.{"\n"}Your <Text style={[styles.future, { color: theme.primary }]}>Future</Text> Starts Here.
          </Text>
        </View>

        <View style={[styles.panel, { backgroundColor: theme.cardBg, borderColor: theme.border, maxWidth: panelMaxWidth }]}>
          <Text style={[styles.heading, { color: theme.text }]}>Welcome Back!</Text>
          <Text style={[styles.subheading, { color: theme.subtext }]}>Login to continue your learning journey</Text>

          <Input
            autoCapitalize="none"
            icon="mail"
            keyboardType="email-address"
            placeholder="Email Address"
            value={form.email}
            onChangeText={(value) => updateField("email", value)}
          />
          <Input
            icon="lock"
            placeholder="Password"
            secureTextEntry={secure}
            value={form.password}
            onChangeText={(value) => updateField("password", value)}
            rightIcon={secure ? "eye" : "eye-off"}
            onRightPress={() => setSecure((value) => !value)}
          />

          <Pressable onPress={() => { setForgotModalOpen(true); setForgotStep(1); setForgotEmail(form.email || ""); }} style={styles.forgot}>
            <Text style={[styles.link, { color: theme.primary }]}>Forgot Password?</Text>
          </Pressable>

          <Pressable disabled={loading} onPress={submitLogin} style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{loading ? "Logging in..." : "Login"}</Text>
          </Pressable>

          {showGoogleSignIn ? (
            <>
              <Divider label="or continue with" />
              <SocialRow onGooglePress={handleGoogleSignIn} />
            </>
          ) : (
            <Text style={[styles.subheading, { color: theme.subtext }]}>Use email and password for this invitation so it stays safely attached while you sign in.</Text>
          )}
          <Divider label="or login as" />

          <View style={styles.roles}>
            {roleOptions.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setRole(item.key)}
                style={({ pressed }) => [
                  styles.roleCard,
                  { backgroundColor: theme.cardBg, borderColor: theme.border },
                  role === item.key && [styles.roleCardActive, { backgroundColor: theme.badgeBg, borderColor: theme.primary }],
                  pressed && styles.pressed
                ]}
              >
                <View style={[styles.roleIcon, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon} size={26} color={item.color} />
                </View>
                <Text numberOfLines={1} style={[styles.roleTitle, { color: theme.text }]}>{item.loginTitle}</Text>
                <Text numberOfLines={2} style={[styles.roleSubtitle, { color: theme.subtext }]}>{item.loginSubtitle}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.primary} />
              </Pressable>
            ))}
          </View>

          <Text style={[styles.switchText, { color: theme.subtext }]}>
            Don't have an account?{" "}
            <Text onPress={() => openSignup(activeRole.key)} style={[styles.link, { color: theme.primary }]}>Sign Up</Text>
          </Text>
        </View>

        {/* PASSWORD RESET OTP MODAL */}
        <Modal visible={forgotModalOpen} transparent animationType="fade" onRequestClose={() => setForgotModalOpen(false)}>
          <View style={styles.otpOverlay}>
            <View style={[styles.otpModalBox, { backgroundColor: theme.cardBg, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.otpHeaderRow}>
                <View style={[styles.otpIconBadge, { backgroundColor: theme.badgeBg }]}>
                  <Feather name="key" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.otpModalTitle, { color: theme.text }]}>Reset Password</Text>
                  <Text style={[styles.otpModalSub, { color: theme.subtext }]}>
                    {forgotStep === 1
                      ? "Step 1 of 3: Enter registered email"
                      : forgotStep === 2
                      ? "Step 2 of 3: Enter 6-digit OTP"
                      : "Step 3 of 3: Set new password"}
                  </Text>
                </View>
                <Pressable onPress={() => setForgotModalOpen(false)} style={[styles.otpCloseBtn, { backgroundColor: theme.badgeBg }]}>
                  <Feather name="x" size={18} color={theme.subtext} />
                </Pressable>
              </View>

              {forgotStep === 1 ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.otpInputLabel, { color: theme.text }]}>Email Address</Text>
                  <TextInput
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.subtext}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[styles.otpTextInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                  />
                  <Pressable disabled={forgotLoading} onPress={handleSendOtp} style={[styles.otpActionBtn, { backgroundColor: theme.primary }]}>
                    <Text style={styles.otpActionBtnText}>{forgotLoading ? "Sending OTP..." : "Send Verification OTP →"}</Text>
                  </Pressable>
                </View>
              ) : forgotStep === 2 ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.otpInputLabel, { color: theme.text }]}>Verification OTP Code</Text>
                  <TextInput
                    value={forgotOtp}
                    onChangeText={setForgotOtp}
                    placeholder="Enter 6-digit OTP (e.g. 123456)"
                    placeholderTextColor={theme.subtext}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={[styles.otpTextInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                  />
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                    <Pressable onPress={() => setForgotStep(1)} style={[styles.otpSecondaryBtn, { backgroundColor: theme.badgeBg, flex: 1 }]}>
                      <Text style={[styles.otpSecondaryBtnText, { color: theme.text }]}>Back</Text>
                    </Pressable>
                    <Pressable disabled={forgotLoading} onPress={handleVerifyOtp} style={[styles.otpActionBtn, { backgroundColor: theme.primary, flex: 2, marginTop: 0 }]}>
                      <Text style={styles.otpActionBtnText}>{forgotLoading ? "Verifying..." : "Verify OTP →"}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.otpInputLabel, { color: theme.text }]}>New Password</Text>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password (min 6 chars)"
                    placeholderTextColor={theme.subtext}
                    secureTextEntry
                    style={[styles.otpTextInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                  />
                  <Pressable disabled={forgotLoading} onPress={handleResetPassword} style={[styles.otpActionBtn, { backgroundColor: theme.primary }]}>
                    <Text style={styles.otpActionBtnText}>{forgotLoading ? "Resetting..." : "Reset Password & Login →"}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoleTabs({ role, setRole, setMode }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.roleTabs, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      {roleOptions.map((item) => {
        const active = role === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              setRole(item.key);
              setMode(item.key === "mentor" ? "mentor" : "signup");
            }}
            style={[styles.roleTab, active && [styles.roleTabActive, { backgroundColor: theme.badgeBg, borderColor: theme.primary }]]}
          >
            <View style={[styles.roleTabIcon, { backgroundColor: `${item.color}18` }]}>
              <Ionicons name={item.icon} size={21} color={item.color} />
            </View>
            <View style={styles.roleTabTextWrap}>
              <Text numberOfLines={1} style={[styles.roleTabTitle, { color: theme.text }]}>{item.title}</Text>
              <Text numberOfLines={1} style={[styles.roleTabSub, { color: theme.subtext }]}>{item.subtitle}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function MentorIntro() {
  const { theme } = useTheme();
  return (
    <View style={[styles.mentorIntro, { backgroundColor: theme.badgeBg, borderColor: theme.border, borderWidth: 1 }]}>
      <View style={styles.mentorAvatar}>
        <View style={styles.mentorHair} />
        <View style={styles.mentorFace} />
        <View style={styles.mentorBody} />
      </View>
      <View style={styles.mentorIntroCopy}>
        <Text style={[styles.mentorIntroTitle, { color: theme.text }]}>Make an Impact</Text>
        <Text style={[styles.mentorIntroText, { color: theme.subtext }]}>Share your knowledge, guide students and build a better tomorrow.</Text>
      </View>
      <View style={[styles.mentorBadge, { backgroundColor: theme.cardBg }]}>
        <Ionicons name="school" size={20} color={theme.primary} />
      </View>
    </View>
  );
}

function Input({ icon, leftExtra, rightIcon, onRightPress, style, ...props }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.inputWrap, { backgroundColor: theme.inputBg, borderColor: theme.border }, style]}>
      <Feather name={icon} size={17} color={theme.subtext} />
      {leftExtra ? <Text style={[styles.leftExtra, { color: theme.text }]}>{leftExtra}</Text> : null}
      <TextInput
        placeholderTextColor={theme.subtext}
        style={[styles.input, { color: theme.text }]}
        {...props}
      />
      {rightIcon ? (
        <Pressable hitSlop={10} onPress={onRightPress}>
          <Feather name={rightIcon} size={17} color={theme.subtext} />
        </Pressable>
      ) : null}
    </View>
  );
}

function SocialRow({ onGooglePress }) {
  const { theme } = useTheme();
  return (
    <View style={styles.socialRow}>
      <Pressable onPress={onGooglePress} style={[styles.googleFullButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <FontAwesome name="google" size={18} color="#EA4335" style={{ marginRight: 10 }} />
        <Text style={[styles.googleFullText, { color: theme.text }]}>Continue with Google</Text>
      </Pressable>
    </View>
  );
}

function Divider({ label }) {
  const { theme } = useTheme();
  return (
    <View style={styles.divider}>
      <View style={[styles.rule, { backgroundColor: theme.border }]} />
      <Text style={[styles.dividerText, { color: theme.subtext }]}>{label}</Text>
      <View style={[styles.rule, { backgroundColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: "#FBFAFF",
    flex: 1
  },
  scroll: {
    alignItems: "center",
    flexGrow: 1,
    paddingTop: 26
  },
  authScroll: {
    alignItems: "center",
    flexGrow: 1,
    paddingBottom: 34,
    paddingHorizontal: 14,
    paddingTop: 22
  },
  backButton: {
    left: 18,
    position: "absolute",
    top: 34,
    zIndex: 2
  },
  hero: {
    alignItems: "center",
    paddingBottom: 24,
    width: "100%"
  },
  heroCompact: {
    paddingBottom: 14,
    transform: [{ scale: 0.92 }]
  },
  tagline: {
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center"
  },
  future: {
    color: colors.primary,
    fontFamily: fonts.bold
  },
  panel: {
    ...shadow,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 22,
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 24,
    width: "100%"
  },
  signupWrap: {
    alignSelf: "center",
    paddingBottom: 16,
    paddingTop: 26,
    width: "100%",
    zIndex: 1
  },
  signupTitle: {
    color: colors.ink,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    lineHeight: 28,
    marginTop: 14,
    textAlign: "center"
  },
  signupSub: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: 16,
    marginTop: 4,
    textAlign: "center"
  },
  heading: {
    color: colors.ink,
    fontFamily: fonts.extraBold,
    fontSize: 20,
    lineHeight: 26
  },
  subheading: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: 18,
    marginTop: 4
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    height: 46,
    marginBottom: 12,
    paddingHorizontal: 12,
    width: "100%"
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    marginLeft: 10,
    paddingVertical: 0
  },
  leftExtra: {
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: 12,
    marginLeft: 9
  },
  forgot: {
    alignSelf: "flex-end",
    marginBottom: 14,
    marginTop: -2
  },
  link: {
    color: colors.primary,
    fontFamily: fonts.bold
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 7,
    height: 48,
    justifyContent: "center",
    width: "100%"
  },
  pressed: {
    opacity: 0.82
  },
  primaryText: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
    fontSize: 14
  },
  divider: {
    alignItems: "center",
    flexDirection: "row",
    marginVertical: 17,
    width: "100%"
  },
  rule: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1
  },
  dividerText: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 10,
    marginHorizontal: 12
  },
  socialRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%"
  },
  socialButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    height: 42,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 8
  },
  socialText: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: 11,
    marginLeft: 9
  },
  roles: {
    flexDirection: "row",
    gap: 10,
    width: "100%"
  },
  roleCard: {
    alignItems: "center",
    backgroundColor: "#F7F5FF",
    borderColor: "transparent",
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    minHeight: 105,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 9
  },
  roleCardActive: {
    backgroundColor: "#F3F0FF",
    borderColor: colors.primary
  },
  mentorCatChoiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#EBEAFA",
    gap: 10
  },
  mentorCatIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  mentorCatTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#181725"
  },
  mentorCatDesc: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "#7C7C9A",
    marginTop: 1
  },
  roleIcon: {
    alignItems: "center",
    borderRadius: 26,
    height: 42,
    justifyContent: "center",
    marginBottom: 7,
    width: 42
  },
  roleTitle: {
    color: colors.primaryDark,
    fontFamily: fonts.bold,
    fontSize: 10,
    textAlign: "center",
    width: "100%"
  },
  roleSubtitle: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 8,
    lineHeight: 12,
    marginTop: 2,
    textAlign: "center"
  },
  switchText: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 18,
    textAlign: "center"
  },
  roleTabs: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.lavenderLine,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    marginBottom: 18,
    padding: 5,
    width: "100%"
  },
  roleTab: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    minHeight: 50,
    minWidth: 0,
    paddingHorizontal: 6
  },
  roleTabActive: {
    backgroundColor: "#F4F0FF",
    borderColor: colors.primary
  },
  roleTabIcon: {
    alignItems: "center",
    borderRadius: 20,
    height: 34,
    justifyContent: "center",
    marginRight: 6,
    width: 34
  },
  roleTabTextWrap: {
    flex: 1,
    minWidth: 0
  },
  roleTabTitle: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 10
  },
  roleTabSub: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 8
  },
  blockTitle: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 13,
    marginTop: 4
  },
  blockSub: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 10,
    marginBottom: 10,
    marginTop: 2
  },
  termsRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 12,
    marginTop: -2
  },
  termsText: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 9,
    marginLeft: 6
  },
  mentorIntro: {
    alignItems: "center",
    backgroundColor: "#F0EDFF",
    borderRadius: 9,
    flexDirection: "row",
    marginBottom: 16,
    minHeight: 88,
    padding: 12,
    width: "100%"
  },
  mentorAvatar: {
    alignItems: "center",
    height: 64,
    justifyContent: "flex-end",
    marginRight: 12,
    width: 60
  },
  mentorHair: {
    backgroundColor: "#1F2750",
    borderRadius: 16,
    height: 25,
    position: "absolute",
    top: 3,
    width: 36
  },
  mentorFace: {
    backgroundColor: "#F0B27B",
    borderRadius: 14,
    height: 28,
    marginBottom: -4,
    width: 28,
    zIndex: 1
  },
  mentorBody: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: 31,
    width: 48
  },
  mentorIntroCopy: {
    flex: 1
  },
  mentorIntroTitle: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 12
  },
  mentorIntroText: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3
  },
  mentorBadge: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginLeft: 8,
    width: 36
  },
  footerWave: {
    backgroundColor: "#DCD3FF",
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
    bottom: -55,
    height: 92,
    left: -40,
    opacity: 0.8,
    position: "absolute",
    right: -40
  },

  // Google Sign-In Button
  googleFullButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderWidth: 1.5,
    borderRadius: 8,
    height: 46,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  googleFullText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#0F172A"
  },

  // OTP Modal Styles
  otpOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  otpModalBox: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8
  },
  otpHeaderRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  otpIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0EDFF",
    alignItems: "center",
    justifyContent: "center"
  },
  otpModalTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#0F172A"
  },
  otpModalSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#64748B",
    marginTop: 1
  },
  otpCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center"
  },
  otpInputLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: "#334155",
    marginBottom: 6
  },
  otpTextInput: {
    height: 46,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: "#0F172A"
  },
  otpActionBtn: {
    height: 46,
    backgroundColor: "#5B3CF5",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14
  },
  otpActionBtnText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#FFFFFF"
  },
  otpSecondaryBtn: {
    height: 46,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  otpSecondaryBtnText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#475569"
  }
});
