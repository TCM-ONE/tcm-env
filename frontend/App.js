import { useEffect, useRef, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Linking, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts
} from "@expo-google-fonts/poppins";
import LoginScreen from "./src/screens/LoginScreen";
import SplashScreen from "./src/screens/SplashScreen";
import HomeScreen from "./src/screens/HomeScreen";
import LearnerOnboardingScreen from "./src/screens/LearnerOnboardingScreen";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { getProfile } from "./src/api/client";
import { setupPushNotifications } from "./src/services/notificationService";
import { captureWebInvitationLink, parseInvitationLink } from "./src/services/invitationLink.mjs";

const STORAGE_SESSION_KEY = "tcm_user_session_v1";
const ONBOARDING_COHORT_KEY_PREFIX = "tcm_pending_onboarding_cohort_v1:";
let initialWebInvitation;

function getInitialInvitation() {
  if (initialWebInvitation !== undefined) return initialWebInvitation;
  initialWebInvitation = Platform.OS === "web" && typeof window !== "undefined"
    ? captureWebInvitationLink(window.location, window.history)
    : { isInvitation: false, token: null };
  return initialWebInvitation;
}

function userStorageId(user) {
  const id = user?._id || user?.id || user?.userId;
  return id ? String(id) : null;
}

function AppContent() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold
  });
  const [invitation, setInvitation] = useState(getInitialInvitation);
  const [session, setSession] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.token || parsed.user)) return parsed;
        }
      }
    } catch (e) {}
    return null;
  });
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [screen, setScreen] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.token || parsed.user)) return invitation.isInvitation ? "onboarding" : "home";
        }
      }
    } catch (e) {}
    return "splash";
  });
  const [onboardingCohortId, setOnboardingCohortId] = useState(null);

  const { theme } = useTheme();

  useEffect(() => {
    let isMounted = true;
    async function restorePersistentSession() {
      try {
        let storedSessionJson = null;
        if (typeof window !== "undefined" && window.localStorage) {
          storedSessionJson = window.localStorage.getItem(STORAGE_SESSION_KEY);
        }
        if (!storedSessionJson) {
          storedSessionJson = await AsyncStorage.getItem(STORAGE_SESSION_KEY);
        }
        if (storedSessionJson) {
          const parsedSession = JSON.parse(storedSessionJson);
          if (parsedSession && (parsedSession.token || parsedSession.user)) {
            if (isMounted) {
              setSession(parsedSession);
              setScreen(invitation.isInvitation ? "onboarding" : "home");
              if (parsedSession.token && typeof setupPushNotifications === "function") {
                setupPushNotifications(parsedSession.token).catch(() => {});
                // Fetch fresh user profile directly from MongoDB backend on reload
                getProfile(parsedSession.token)
                  .then((res) => {
                    if (res?.user && isMounted) {
                      const updatedSession = { ...parsedSession, user: res.user };
                      setSession(updatedSession);
                      const jsonStr = JSON.stringify(updatedSession);
                      AsyncStorage.setItem(STORAGE_SESSION_KEY, jsonStr).catch(() => {});
                      if (typeof window !== "undefined" && window.localStorage) {
                        window.localStorage.setItem(STORAGE_SESSION_KEY, jsonStr);
                      }
                    }
                  })
                  .catch((e) => {
                    console.log("Profile DB sync notice (session preserved):", e);
                  });
              }
              return;
            }
          }
        }
      } catch (err) {
        console.log("Failed to restore session from AsyncStorage:", err);
      }
      if (isMounted && !session) {
        setScreen("login");
      }
    }

    restorePersistentSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    let mounted = true;
    const handleUrl = (url) => {
      if (!url) return;
      const parsed = parseInvitationLink(url);
      if (!parsed.isInvitation) return;
      setInvitation(parsed);
      setScreen(sessionRef.current?.token ? "onboarding" : "login");
    };
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (mounted) handleUrl(url);
    });
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (!session?.token || invitation.isInvitation) return;
    const userId = userStorageId(session.user);
    if (!userId) return;
    AsyncStorage.getItem(`${ONBOARDING_COHORT_KEY_PREFIX}${userId}`)
      .then((cohortId) => {
        if (cohortId) {
          setOnboardingCohortId(cohortId);
          setScreen((current) => current === "home" ? "onboarding" : current);
        }
      })
      .catch(() => {});
  }, [session?.token, session?.user, invitation.isInvitation]);

  useEffect(() => {
    if (screen === "onboarding" && invitation.isInvitation && !session?.token) setScreen("login");
  }, [screen, invitation.isInvitation, session?.token]);

  async function handleLogin(nextSession) {
    setSession(nextSession);
    setScreen(invitation.isInvitation ? "onboarding" : "home");
    try {
      if (nextSession) {
        const jsonStr = JSON.stringify(nextSession);
        await AsyncStorage.setItem(STORAGE_SESSION_KEY, jsonStr);
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(STORAGE_SESSION_KEY, jsonStr);
        }
      }
    } catch (err) {
      console.log("Failed to save session to AsyncStorage:", err);
    }
    if (nextSession?.token && typeof setupPushNotifications === "function") {
      setupPushNotifications(nextSession.token).catch(() => {});
    }
  }

  async function handleUserUpdate(updatedUser) {
    if (!updatedUser) return;
    setSession((prev) => {
      const nextSession = { ...(prev || {}), user: updatedUser };
      const jsonStr = JSON.stringify(nextSession);
      AsyncStorage.setItem(STORAGE_SESSION_KEY, jsonStr).catch(() => {});
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_SESSION_KEY, jsonStr);
      }
      return nextSession;
    });
  }

  async function handleLogout() {
    setSession(null);
    setScreen("login");
    try {
      await AsyncStorage.removeItem(STORAGE_SESSION_KEY);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch (err) {
      console.log("Failed to remove session from AsyncStorage:", err);
    }
  }

  async function handleInvitationAccepted(cohortId) {
    setOnboardingCohortId(cohortId);
    const userId = userStorageId(session?.user);
    if (userId) await AsyncStorage.setItem(`${ONBOARDING_COHORT_KEY_PREFIX}${userId}`, cohortId);
    setInvitation({ isInvitation: false, token: null });
  }

  function handleOnboardingClose() {
    setScreen("home");
  }

  async function handleOnboardingFinish() {
    const userId = userStorageId(session?.user);
    if (userId) await AsyncStorage.removeItem(`${ONBOARDING_COHORT_KEY_PREFIX}${userId}`).catch(() => {});
    setOnboardingCohortId(null);
    setInvitation({ isInvitation: false, token: null });
    setScreen("home");
  }

  return (
    <SafeAreaProvider style={{ flex: 1, width: "100%", height: "100%", minHeight: "100%", backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} backgroundColor={theme.bg} />
      {(!fontsLoaded || screen === "splash") && <SplashScreen />}
      {fontsLoaded && screen === "login" && (
        <LoginScreen onLogin={handleLogin} onCancelGuest={() => setScreen("home")} preserveInvitation={invitation.isInvitation} />
      )}
      {fontsLoaded && screen === "onboarding" && session?.token && (
        <LearnerOnboardingScreen
          session={session}
          invitationToken={invitation.token}
          invalidInvitationLink={invitation.isInvitation && !invitation.token}
          cohortId={onboardingCohortId}
          onInvitationAccepted={handleInvitationAccepted}
          onSwitchAccount={handleLogout}
          onClose={handleOnboardingClose}
          onFinish={handleOnboardingFinish}
        />
      )}
      {fontsLoaded && screen === "home" && (
        <HomeScreen
          session={{ ...session, onLogout: handleLogout }}
          onLogout={handleLogout}
          onRequireLogin={() => setScreen("login")}
          onUserUpdate={handleUserUpdate}
        />
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
