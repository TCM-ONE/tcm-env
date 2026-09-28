import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, FontAwesome, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { getCourseDetails } from "../api/client";
import { generateCourseOverviewInsightsWithAI } from "../api/gemini";
import { colors, shadow } from "../constants/theme";
import { fonts } from "../constants/fonts";
import { useTheme } from "../context/ThemeContext";
import RazorpayPaymentModal from "../components/RazorpayPaymentModal";

function safeImageUri(url, fallback = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=640&q=80") {
  if (!url || typeof url !== "string") return fallback;
  if (url.startsWith("blob:") || url.includes("blob:http")) return fallback;
  return url;
}

export default function CourseDetailsScreen({ session, user = {}, courseId = "p1", onBack, onEditCourse, onSelectMentor }) {
  const { theme } = useTheme();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [expandedAbout, setExpandedAbout] = useState(false);
  const [expandedModules, setExpandedModules] = useState({ m1: true, m2: true });
  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    loadCourseDetails();
  }, [courseId, session?.token]);

  async function loadCourseDetails() {
    setLoading(true);
    try {
      const data = await getCourseDetails(session?.token, courseId);
      if (data && data.title) {
        setCourse(data);
        loadAiInsights(data.title, data.category, data.level);
      }
    } catch (err) {
      console.warn("Error fetching course details:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAiInsights(title, category, level) {
    try {
      const insights = await generateCourseOverviewInsightsWithAI(title, category, level);
      if (insights) setAiInsights(insights);
    } catch (e) {}
  }

  function toggleModule(modId) {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  }

  function toggleExpandAll() {
    const allExpanded = Object.keys(expandedModules).length >= 3 && Object.values(expandedModules).every(Boolean);
    if (allExpanded) {
      setExpandedModules({});
    } else {
      setExpandedModules({ m1: true, m2: true, m3: true, m4: true });
    }
  }

  const targetCourseTitle = course?.title || "";
  const isNeet = targetCourseTitle ? targetCourseTitle.toLowerCase().includes("neet") : String(courseId || "").toLowerCase().includes("neet");
  const isJee = targetCourseTitle ? targetCourseTitle.toLowerCase().includes("jee") : String(courseId || "").toLowerCase().includes("jee");

  const heroBadge = {
    tag: isNeet ? "NEET 2026 LIVE" : isJee ? "JEE MAIN & ADV" : "POPULAR BATCH"
  };

  const fallbackTitle = isNeet
    ? "NEET Ultimate Crash Course 2026"
    : isJee
    ? "JEE Rank Booster Batch 2026"
    : "TCM One Live Masterclass";

  const fallbackSubtitle = isNeet
    ? "Physics • Chemistry • Biology • 5000+ MCQs & Mock Tests"
    : isJee
    ? "Advanced Maths • Physics • Organic Chemistry • IITian Mentors"
    : "Live Interactive Classes • Hands-on Labs • Placement Support";

  const fallbackCourseData = {
    id: courseId,
    tag: isNeet ? "🔴 NEET 2026 LIVE" : isJee ? "⚡ JEE MAIN & ADV" : "POPULAR BATCH",
    title: fallbackTitle,
    subtitle: fallbackSubtitle,
    rating: "4.9",
    reviews: "1.5K",
    students: "5.2K",
    totalLength: isNeet || isJee ? "180 Days" : "45 Days",
    level: isNeet ? "Medical Aspirants" : isJee ? "Engineering Aspirants" : "All Skill Levels",
    about: [
      `Course Overview\nMaster ${fallbackTitle} with live interactive guidance, daily practical exercises, and high-yield question solving. ${fallbackSubtitle}`,
      `Who Should Join?\nDesigned for learners seeking real-world practical skills with 1-on-1 live mentor doubt clearance and daily problem solving.`,
      `Career & Exam Outcomes\nWork on live industry projects / high-yield test series, build your portfolio, and earn an official TCM One Verified Certificate upon completion.`
    ].join("\n\n"),
    whatYouWillLearn: [
      `Master core fundamentals and advanced concepts of ${fallbackTitle}`,
      "Build real-world practical projects & solve high-yield MCQs",
      "Hands-on practical labs and daily doubt clearance",
      "Industry best practices & clean code architecture",
      "Certificate of completion & placement support"
    ],
    features: [
      { id: "f1", icon: "youtube-subscription", label: "Lifetime Access", color: "#0A6836", bg: "#E8F5E9" },
      { id: "f2", icon: "certificate", label: "Certificate Included", color: "#2E7D32", bg: "#ECF9E9" },
      { id: "f3", icon: "account-group", label: "Community Access", color: "#E7A900", bg: "#FFF6DA" },
      { id: "f4", icon: "download", label: "Downloadable Resources", color: "#2F79B9", bg: "#EAF5FF" }
    ],
    curriculum: {
      totalLessons: "20 Lessons",
      totalModules: "5 Modules",
      modules: [
        {
          id: "m1",
          title: `Day 1: ${fallbackTitle} Core Setup & Foundations`,
          lessonsCount: "4 Lessons",
          expanded: true,
          lessons: [
            { id: "l1", title: "1.1 Tooling & Environment Configuration", duration: "15 mins", type: "video" },
            { id: "l2", title: "1.2 Core Fundamentals & Syntax Setup", duration: "30 mins", type: "video" }
          ]
        },
        {
          id: "m2",
          title: `Day 2: Core Architecture & Live Logic`,
          lessonsCount: "4 Lessons",
          expanded: false,
          lessons: [
            { id: "l3", title: "2.1 Key Architectural Patterns & Logic", duration: "35 mins", type: "video" },
            { id: "l4", title: "2.2 State Management & API Connectivity", duration: "40 mins", type: "video" }
          ]
        },
        {
          id: "m3",
          title: `Day 3: Advanced API Integration & Database Setup`,
          lessonsCount: "4 Lessons",
          expanded: false,
          lessons: [
            { id: "l5", title: "3.1 REST API Design & Database Schema", duration: "45 mins", type: "video" },
            { id: "l6", title: "3.2 Hands-on Lab: Real-Time Data Sync", duration: "30 mins", type: "video" }
          ]
        },
        {
          id: "m4",
          title: `Day 4: Security, Performance & Testing`,
          lessonsCount: "4 Lessons",
          expanded: false,
          lessons: [
            { id: "l7", title: "4.1 Security Practice & Auth Validation", duration: "35 mins", type: "video" },
            { id: "l8", title: "4.2 Automated Testing & Continuous Integration", duration: "40 mins", type: "video" }
          ]
        },
        {
          id: "m5",
          title: `Day 5: Real-World Capstone Project & Placement Drive`,
          lessonsCount: "4 Lessons",
          expanded: false,
          lessons: [
            { id: "l9", title: "5.1 End-to-End Live Industry Capstone", duration: "50 mins", type: "video" },
            { id: "l10", title: "5.2 Portfolio Defense & Placement Referral", duration: "25 mins", type: "video" }
          ]
        }
      ]
    },
    price: "₹1,499",
    originalPrice: "₹4,999",
    discountPill: "70% OFF"
  };

  const courseData = course || fallbackCourseData;

  function handleConnectWhatsApp() {
    const title = courseData?.title || "TCM One Course";
    const price = courseData?.price || "₹1,499";
    const message = `Hi TCM One Support Team! I am interested in purchasing the course: "${title}" (${price}). Please guide me.`;
    const url = `https://wa.me/919238695500?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("WhatsApp Direct Contact", "Please message +91 9238695500 on WhatsApp for course enrollment.");
    });
  }

  function handleEnrollNow() {
    setShowPaymentModal(true);
  }

  function handleShare() {
    const shareUrl = `https://app.thecodemunk.in/course/${courseId}`;
    Share.share({
      title: courseData?.title || "TCM One Course",
      message: `Check out this course on TCM One: "${courseData?.title || "Masterclass"}"\n\nEnroll link: ${shareUrl}`
    }).catch(() => {});
  }

  const curriculumModules = courseData.curriculum?.modules || courseData.modules || [];
  const totalModCount = courseData.curriculum?.totalModules || `${curriculumModules.length} Modules`;
  const totalLesCount = courseData.curriculum?.totalLessons || `${curriculumModules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} Lessons`;
  const isMentorUser = Boolean(user?.role === "mentor" || user?.isMentor);
  const themedSurface = { backgroundColor: theme.cardBg, borderColor: theme.border };
  const themedSoftSurface = { backgroundColor: theme.isDark ? theme.inputBg || "#131927" : "#FBFBFE", borderColor: theme.border };
  const themedBadgeSurface = { backgroundColor: theme.badgeBg, borderColor: theme.border };

  function stripEmojis(str) {
    if (!str) return "";
    return str
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu, "")
      .replace(/[🚀🎯🏆💡✨🐍🔴⚡💻💰📈🏢💼]/g, "")
      .trim();
  }

  function getCompanyLogoUrl(companyName) {
    const name = (companyName || "").toLowerCase().trim();
    if (name.includes("google")) return "https://logo.clearbit.com/google.com";
    if (name.includes("amazon")) return "https://logo.clearbit.com/amazon.com";
    if (name.includes("tcs") || name.includes("tata")) return "https://logo.clearbit.com/tcs.com";
    if (name.includes("infosys")) return "https://logo.clearbit.com/infosys.com";
    if (name.includes("microsoft")) return "https://logo.clearbit.com/microsoft.com";
    if (name.includes("accenture")) return "https://logo.clearbit.com/accenture.com";
    if (name.includes("wipro")) return "https://logo.clearbit.com/wipro.com";
    if (name.includes("flipkart")) return "https://logo.clearbit.com/flipkart.com";
    if (name.includes("meta") || name.includes("facebook")) return "https://logo.clearbit.com/meta.com";
    if (name.includes("apple")) return "https://logo.clearbit.com/apple.com";
    if (name.includes("uber")) return "https://logo.clearbit.com/uber.com";
    if (name.includes("rbi") || name.includes("bank")) return "https://logo.clearbit.com/rbi.org.in";
    if (name.includes("aiims") || name.includes("hospital")) return "https://logo.clearbit.com/aiims.edu";
    return `https://logo.clearbit.com/${name.replace(/[^a-z0-9]/g, "")}.com`;
  }

  function autoFormatDescriptionContent(rawText) {
    if (!rawText) return null;
    const clean = stripEmojis(rawText);

    const headingKeywords = [
      "What You'll Learn",
      "What You Will Learn",
      "Course Details",
      "Course Highlights",
      "Key Highlights",
      "Prerequisites",
      "Who Should Join",
      "Target Audience",
      "Career Outcomes",
      "Why Join",
      "About The Course",
      "Course Overview"
    ];

    const patternStr = headingKeywords.map((h) => h.replace("'", "['’]?")).join("|");
    const regex = new RegExp(`(?=\\b(?:${patternStr})\\b)`, "gi");

    const parts = clean.split(regex).map((p) => p.trim()).filter(Boolean);

    if (parts.length <= 1 && !clean.includes("*")) {
      return <Text style={[styles.compactParagraphText, { color: theme.subtext }]}>{clean}</Text>;
    }

    return (
      <View style={{ gap: 8 }}>
        {parts.map((part, pIdx) => {
          let matchedHeading = "";
          let bodyStr = part;

          for (const hk of headingKeywords) {
            const hkNorm = hk.toLowerCase().replace(/['’]/g, "");
            if (part.toLowerCase().replace(/['’]/g, "").startsWith(hkNorm)) {
              matchedHeading = hk;
              bodyStr = part.substring(hk.length).replace(/^[\s:*–-]+/, "").trim();
              break;
            }
          }

          const hasAsterisks = bodyStr.includes("*");
          const bulletItems = hasAsterisks
            ? bodyStr.split("*").map((b) => b.trim()).filter((b) => b.length > 1)
            : [];

          const firstPara = hasAsterisks && !bodyStr.trim().startsWith("*") ? bodyStr.split("*")[0].trim() : (hasAsterisks ? "" : bodyStr);

          return (
            <View key={pIdx} style={matchedHeading ? [styles.autoSubSectionBox, themedSoftSurface] : null}>
              {matchedHeading ? (
                <View style={styles.autoSubHeaderRow}>
                  <View style={styles.autoSubHeaderDot} />
                  <Text style={[styles.autoSubHeaderTitle, { color: theme.text }]}>{matchedHeading}</Text>
                </View>
              ) : null}

              {firstPara ? <Text style={[styles.compactParagraphText, { color: theme.subtext }]}>{firstPara}</Text> : null}

              {bulletItems.length > 0 ? (
                <View style={styles.autoBulletGrid}>
                  {bulletItems.map((item, bIdx) => (
                    <View key={bIdx} style={[styles.autoBulletChip, themedSurface]}>
                      <Feather name="check" size={10} color={theme.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.autoBulletChipText, { color: theme.text }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : !firstPara && bodyStr ? (
                <Text style={[styles.compactParagraphText, { color: theme.subtext }]}>{bodyStr}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }

  function renderFormattedAbout(aboutText, expanded) {
    if (!aboutText) return null;

    const cleanAboutText = stripEmojis(aboutText);
    const words = cleanAboutText.trim().split(/\s+/);
    const isLongText = words.length > 30;
    const rawDisplayText = (!expanded && isLongText) ? words.slice(0, 30).join(" ") + "..." : cleanAboutText;

    const blocks = rawDisplayText.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const whyList = (aiInsights?.whyLearn || []).map(stripEmojis);

    const getSectionIconInfo = (headerStr) => {
      const h = (headerStr || "").toLowerCase();
      if (h.includes("overview") || h.includes("scope")) {
        return { icon: "compass-outline", color: "#0A6836", bg: "#E8F5E9" };
      }
      if (h.includes("join") || h.includes("target") || h.includes("who")) {
        return { icon: "target", color: "#E7A900", bg: "#FFF8EC" };
      }
      if (h.includes("outcome") || h.includes("placement") || h.includes("career")) {
        return { icon: "trophy-outline", color: "#2E7D32", bg: "#ECF9E9" };
      }
      return { icon: "bookmark-outline", color: "#2F79B9", bg: "#EBF5FF" };
    };

    return (
      <View style={styles.aboutContainer}>
        {/* A. Description Paragraphs (30 Words Max Initially, Emoji Free) */}
        {blocks.map((block, index) => {
          const lines = block.split("\n");
          let header = "";
          let bodyLines = [];

          if (lines[0] && (lines[0].includes("Overview") || lines[0].includes("Join") || lines[0].includes("Outcomes") || lines[0].includes("Placement") || lines[0].includes(":"))) {
            header = stripEmojis(lines[0].replace(/\*\*/g, "").trim());
            bodyLines = lines.slice(1);
          } else {
            bodyLines = lines;
          }

          const bodyText = stripEmojis(bodyLines.join(" ").trim());
          const iconInfo = getSectionIconInfo(header);

          return (
            <View key={index} style={styles.compactAboutBlock}>
              {header ? (
                <View style={styles.compactHeaderRow}>
                  <View style={[styles.compactIconBadge, { backgroundColor: iconInfo.bg }]}>
                    <MaterialCommunityIcons name={iconInfo.icon} size={12} color={iconInfo.color} />
                  </View>
                  <Text style={[styles.compactHeaderTitle, { color: theme.text }]}>{header}</Text>
                </View>
              ) : null}

              {bodyText ? (
                autoFormatDescriptionContent(bodyText)
              ) : null}
            </View>
          );
        })}

        {/* B. Why Should You Learn This? (Sleek Compact AI Insight) */}
        {whyList.length > 0 ? (
          <View style={[styles.compactWhyCard, { backgroundColor: theme.isDark ? "#2A1F14" : "#FFFBFA", borderColor: theme.isDark ? "#713F12" : "#FEE8C6" }]}>
            <View style={styles.compactHeaderRow}>
              <View style={[styles.compactIconBadge, { backgroundColor: "#FFF8EC" }]}>
                <MaterialCommunityIcons name="bullseye-arrow" size={12} color="#E7A900" />
              </View>
              <Text style={[styles.compactHeaderTitle, { color: theme.text }]}>Why Learn This Course?</Text>
              <View style={[styles.miniAiPill, { backgroundColor: theme.badgeBg }]}>
                <MaterialCommunityIcons name="sparkles" size={9} color={theme.primary} />
                <Text style={[styles.miniAiPillText, { color: theme.primary }]}>AI</Text>
              </View>
            </View>

            <View style={{ gap: 6, marginTop: 4 }}>
              {whyList.map((item, idx) => (
                <View key={idx} style={styles.miniBulletRow}>
                  <View style={[styles.miniBulletDot, { backgroundColor: theme.primary }]} />
                  <Text style={[styles.miniBulletText, { color: theme.subtext }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  const displayMentorName = courseData.mentorName || courseData.instructor || courseData.mentor?.name || "TCM One Expert Educator";
  const displayMentorRole = courseData.mentorRole || courseData.instructorRole || courseData.mentor?.role || "Senior Lead Mentor";
  const displayMentorAvatar = safeImageUri(courseData.mentorAvatarUrl || courseData.mentorAvatar || courseData.instructorAvatar || courseData.mentor?.avatarUrl || courseData.mentor?.avatar, "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150");
  const displayMentorId = courseData.mentorId || courseData.mentor?._id || courseData.mentor?.id || courseData.mentorName || courseData.instructor || courseData.mentor?.name || "m1";

  function renderSalaryInsightsCard() {
    const salary = aiInsights?.salaryInsights;
    if (!salary) return null;

    const avgSalaryVal = stripEmojis(salary.avgSalary || "₹6.5L – ₹18.0L /yr");
    const growthVal = stripEmojis(salary.growthRate || "+32% YoY High Growth");

    return (
      <View style={[styles.sectionContainer, themedSurface, { padding: 0, overflow: "hidden" }]}>
        {/* Header Gradient */}
        <LinearGradient
          colors={theme.isDark ? ["#1E1B4B", "#0F172A"] : ["#0A6836", "#14532D"]}
          style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255, 255, 255, 0.2)", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="trending-up" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: "#FFFFFF" }}>Career & Salary Spectrum</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: "rgba(255, 255, 255, 0.8)" }}>Live Industry Benchmarks & Growth Insights</Text>
            </View>
          </View>
          <View style={{ backgroundColor: "rgba(255, 255, 255, 0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MaterialCommunityIcons name="sparkles" size={11} color="#FFD700" />
            <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: "#FFFFFF" }}>AI Verified</Text>
          </View>
        </LinearGradient>

        <View style={{ padding: 14, gap: 14 }}>
          {/* Top 2 Salary Metric Cards */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={[{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border }, themedSoftSurface]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <MaterialCommunityIcons name="cash-multiple" size={16} color={theme.primary} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: theme.subtext }}>Avg Starting CTC</Text>
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: theme.primary }}>{avgSalaryVal}</Text>
            </View>

            <View style={[{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border }, themedSoftSurface]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <MaterialCommunityIcons name="chart-line-variant" size={16} color="#16A34A" />
                <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: theme.subtext }}>Industry Demand</Text>
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: "#16A34A" }}>{growthVal}</Text>
            </View>
          </View>

          {/* Hiring Partners Carousel */}
          {salary.hiringCompanies && salary.hiringCompanies.length > 0 ? (
            <View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: theme.text, marginBottom: 8 }}>Top Hiring Partners:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: 8 }}>
                {salary.hiringCompanies.map((comp, cIdx) => (
                  <View key={cIdx} style={[{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.border }, themedSoftSurface]}>
                    <Image
                      source={{ uri: getCompanyLogoUrl(comp) }}
                      style={{ width: 20, height: 20, borderRadius: 4 }}
                      resizeMode="contain"
                    />
                    <Text style={{ fontFamily: fonts.semiBold, fontSize: 12, color: theme.text }}>{stripEmojis(comp)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Target Job Roles */}
          {salary.careerRoles && salary.careerRoles.length > 0 ? (
            <View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: theme.text, marginBottom: 6 }}>Target Roles:</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {salary.careerRoles.map((role, rIdx) => (
                  <View key={rIdx} style={{ backgroundColor: theme.badgeBg, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: theme.primary }}>💼 {stripEmojis(role)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Bottom Career Support Footer */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.isDark ? "#1E293B" : "#ECFDF5", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.isDark ? "#334155" : "#A7F3D0" }}>
            <MaterialCommunityIcons name="check-decagram" size={16} color="#10B981" />
            <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 11, color: theme.isDark ? "#6EE7B7" : "#047857" }}>
              Includes 1-on-1 Resume Review, Live Mock Interviews & TCM One Placement Network Support
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Standardized App Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderBottomColor: theme.border, position: "relative", justifyContent: "center", minHeight: 48 }]}>
        <Pressable
          onPress={() => {
            if (onBack) {
              onBack();
            } else if (typeof window !== "undefined" && window.history && window.history.length > 1) {
              window.history.back();
            }
          }}
          style={({ pressed }) => [
            {
              position: "absolute",
              left: 14,
              top: 10,
              zIndex: 10,
              padding: 4,
              flexDirection: "row",
              alignItems: "center"
            },
            pressed && styles.pressed
          ]}
        >
          <Feather name="chevron-left" size={24} color={theme.text} />
        </Pressable>

        <View style={{ position: "absolute", left: 0, right: 0, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
          <Text numberOfLines={1} style={[styles.screenTitle, { color: theme.text, textAlign: "center" }]}>Course Details</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, position: "absolute", right: 14, top: 10, zIndex: 10 }}>
          {isMentorUser ? (
            <Pressable onPress={() => onEditCourse && onEditCourse(courseData)} style={({ pressed }) => [{ padding: 4 }, pressed && styles.pressed]}>
              <Feather name="edit-3" size={20} color={theme.primary} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => setBookmarked((p) => !p)} style={({ pressed }) => [{ padding: 4 }, pressed && styles.pressed]}>
            <Feather name="bookmark" size={20} color={bookmarked ? theme.primary : theme.text} fill={bookmarked ? theme.primary : "none"} />
          </Pressable>
          <Pressable onPress={handleShare} style={({ pressed }) => [{ padding: 4 }, pressed && styles.pressed]}>
            <Feather name="share-2" size={19} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingTop: 12 }]}>
        {/* 2. Dark Hero Header Card */}
        <LinearGradient colors={theme.isDark ? ["#0B0F19", "#111625"] : ["#0D0B26", "#19154C"]} style={[styles.heroCard, { borderColor: theme.border, borderWidth: 1 }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroLeftCol}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>{courseData.tag || "BESTSELLER"}</Text>
              </View>
              <Text style={styles.heroCourseTitle} numberOfLines={2}>{courseData.title}</Text>
              <Text style={styles.heroCourseSub} numberOfLines={2}>{courseData.subtitle}</Text>
            </View>

            <View style={styles.heroRightCol}>
              <Image
                source={{ uri: safeImageUri(courseData.imageUrl || courseData.image) }}
                style={styles.heroGraphicImg}
              />
            </View>
          </View>

          {/* Hero Metrics Row */}
          <View style={styles.heroStatsRow}>
            <View style={styles.statItem}>
              <View style={styles.statTop}>
                <FontAwesome name="star" size={11} color="#FFB800" />
                <Text style={styles.statVal}>{courseData.rating}</Text>
                <Text style={styles.statSubText}>({courseData.reviews})</Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>Ratings</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statTop}>
                <Feather name="users" size={11} color="#A086FD" />
                <Text style={styles.statVal}>{courseData.students}</Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>Students</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statTop}>
                <Feather name="clock" size={11} color="#A086FD" />
                <Text style={styles.statVal}>{courseData.totalLength}</Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>Total Length</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statTop}>
                <Feather name="trending-up" size={11} color="#A086FD" />
                <Text style={styles.statVal}>{courseData.level === "Beginner to Advanced" ? "Beg - Adv" : courseData.level}</Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>Level</Text>
            </View>
          </View>
        </LinearGradient>

        {/* 3. Feature Highlights Grid */}
        <View style={[styles.featuresRow, themedSurface]}>
          {(courseData.features || [
            { id: "f1", icon: "youtube-subscription", label: "Lifetime Access", color: theme.primary, bg: theme.badgeBg },
            { id: "f2", icon: "certificate", label: "Certificate Included", color: "#2E7D32", bg: theme.isDark ? "#064E3B" : "#ECF9E9" },
            { id: "f3", icon: "account-group", label: "Community Access", color: "#E7A900", bg: theme.isDark ? "#78350F" : "#FFF6DA" },
            { id: "f4", icon: "download", label: "Downloadable Resources", color: "#2F79B9", bg: theme.isDark ? "#1E3A8A" : "#EAF5FF" }
          ]).map((feat) => (
            <View key={feat.id} style={[styles.featureCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.featureIconWrap, { backgroundColor: feat.bg }]}>
                <MaterialCommunityIcons name={feat.icon} size={20} color={feat.color} />
              </View>
              <Text style={[styles.featureLabel, { color: theme.text }]}>{feat.label}</Text>
            </View>
          ))}
        </View>

        {/* 4. About this course Section */}
        <View style={[styles.sectionContainer, themedSurface]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>About this course</Text>
          {renderFormattedAbout(courseData.about, expandedAbout)}
          <Pressable onPress={() => setExpandedAbout((p) => !p)} style={styles.readMoreRow}>
            <Text style={[styles.readMoreText, { color: theme.primary }]}>{expandedAbout ? "Read Less" : "Show Full Overview"}</Text>
            <Feather name={expandedAbout ? "chevron-up" : "chevron-down"} size={14} color={theme.primary} />
          </Pressable>
        </View>

        {/* 4.5. Lead Instructor / Mentor Card */}
        <View style={[styles.sectionContainer, themedSurface]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Lead Mentor & Instructor</Text>
          <TouchableOpacity
            onPress={() => {
              if (onSelectMentor) onSelectMentor(displayMentorId);
            }}
            activeOpacity={0.8}
            style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}
          >
            <Image
              source={{ uri: displayMentorAvatar }}
              style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: theme.primary }}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: theme.text }}>{displayMentorName}</Text>
                <MaterialCommunityIcons name="check-decagram" size={15} color={theme.primary} />
              </View>
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: theme.subtext }}>{displayMentorRole}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                <FontAwesome name="star" size={11} color="#FFB800" />
                <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: theme.text }}>{courseData.mentorRating || "4.9"}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: theme.subtext }}>({courseData.mentorReviews || courseData.reviews || "1.2K"} Reviews)</Text>
              </View>
            </View>
            <View
              style={{ backgroundColor: theme.badgeBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.border }}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: theme.primary }}>View Profile</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. What you'll learn Section */}
        <View style={[styles.sectionContainer, themedSurface]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What you'll learn</Text>
          <View style={styles.learnGrid}>
            {(courseData.whatYouWillLearn || [
              "Master core architecture and practical concepts",
              "Build real-world production-grade projects",
              "Hands-on labs and live doubt clearance",
              "Certificate of completion & placement support"
            ]).map((item, idx) => (
              <View key={idx} style={[styles.learnItemRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={[styles.checkCircle, { backgroundColor: theme.badgeBg }]}>
                  <Feather name="check" size={11} color={theme.primary} />
                </View>
                <Text style={[styles.learnItemText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 6. Course Curriculum Section */}
        <View style={[styles.sectionContainer, themedSurface]}>
          <View style={styles.curriculumHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Course Curriculum</Text>
              <Text style={[styles.curriculumSub, { color: theme.subtext }]}>
                {totalLesCount} • {totalModCount}
              </Text>
            </View>
            <Pressable onPress={toggleExpandAll}>
              <Text style={[styles.expandAllText, { color: theme.primary }]}>Expand All</Text>
            </Pressable>
          </View>

          {/* Accordion Modules */}
          {curriculumModules.map((mod, idx) => {
            const mId = mod.id || `m${idx + 1}`;
            const isExpanded = expandedModules[mId] !== false;
            return (
              <View key={mId} style={[styles.moduleCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Pressable onPress={() => toggleModule(mId)} style={[styles.moduleHeader, { borderBottomColor: isExpanded ? theme.border : "transparent" }]}>
                  <View style={styles.moduleHeaderLeft}>
                    <View style={[styles.moduleNumCircle, { backgroundColor: theme.badgeBg }]}>
                      <Text style={[styles.moduleNumText, { color: theme.primary }]}>{idx + 1}</Text>
                    </View>
                    <Text style={[styles.moduleTitleText, { color: theme.text }]}>{mod.title}</Text>
                  </View>
                  <View style={styles.moduleHeaderRight}>
                    <Text style={[styles.lessonsCountText, { color: theme.subtext }]}>{mod.lessonsCount || (mod.lessons ? `${mod.lessons.length} Lessons` : "3 Lessons")}</Text>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={theme.subtext} />
                  </View>
                </Pressable>

                {isExpanded && mod.lessons ? (
                  <View style={styles.lessonsList}>
                    {mod.lessons.map((les, lIdx) => {
                      const lesObj = typeof les === "string" ? { id: `les-${lIdx}`, title: les, duration: "25 mins", type: "video" } : les;
                      return (
                        <Pressable
                          key={lesObj.id || `les-${lIdx}`}
                          onPress={() => Alert.alert("Play Lesson", `Starting ${lesObj.title}...`)}
                          style={[styles.lessonItemRow, { borderBottomColor: theme.border }]}
                        >
                          <View style={styles.lessonLeft}>
                            <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
                            <View style={[styles.playIconCircle, { backgroundColor: theme.badgeBg }]}>
                              {lesObj.type === "quiz" ? (
                                <MaterialCommunityIcons name="target" size={12} color={theme.primary} />
                              ) : (
                                <Feather name="play" size={10} color={theme.primary} style={{ marginLeft: 1 }} />
                              )}
                            </View>
                            <Text style={[styles.lessonTitleText, { color: theme.text }]}>{lesObj.title}</Text>
                          </View>
                          <Text style={[styles.lessonDurationText, { color: theme.subtext }]}>{lesObj.duration || "25 mins"}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* 7. Salary & Career Prospects Section (Separate Section After Curriculum) */}
        {renderSalaryInsightsCard()}
      </ScrollView>

      {/* 7. Sticky Bottom Purchase Bar */}
      <View style={[styles.stickyPurchaseBar, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]}>
        <View style={styles.priceCol}>
          <View style={styles.priceRow}>
            <Text style={[styles.currentPriceText, { color: theme.text }]}>{courseData.price}</Text>
            <Text style={[styles.originalPriceText, { color: theme.subtext }]}>{courseData.originalPrice}</Text>
            <View style={[styles.discountPill, { backgroundColor: theme.badgeBg }]}>
              <Text style={[styles.discountPillText, { color: theme.primary }]}>{courseData.discountPill}</Text>
            </View>
          </View>
          <Text style={[styles.priceTaxesText, { color: theme.subtext }]}>Inclusive of all taxes</Text>
        </View>

        <Pressable onPress={handleEnrollNow} style={[styles.stickyEnrollBtn, { backgroundColor: theme.primary }]}>
          <Text style={styles.stickyEnrollBtnText}>Enroll Now →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "100%",
    width: "100%",
    position: "relative",
    backgroundColor: "#F8FAFC"
  },

  // 1. Header Bar
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F4F3FA",
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitleWrap: {},
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: "#181725"
  },
  headerSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#7C7C9A"
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  editHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A6836",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20
  },
  editHeaderBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#FFFFFF"
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 100
  },
  pressed: {
    opacity: 0.7
  },
  screenTitle: {
    fontSize: 19,
    fontFamily: fonts.semiBold,
    color: "#181725"
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F4F3FA",
    alignItems: "center",
    justifyContent: "center"
  },

  scrollContent: {
    paddingHorizontal: 2,
    paddingTop: 8,
    paddingBottom: 110,
    width: "100%"
  },

  // 2. Dark Hero Header Card
  heroCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    ...shadow.soft
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 8
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 4
  },
  tagBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#0A6836",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6
  },
  tagBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: "#FFFFFF",
    letterSpacing: 0.6
  },
  heroCourseTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: "#FFFFFF",
    lineHeight: 23,
    marginBottom: 4
  },
  heroCourseSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#C8C4E6",
    lineHeight: 15
  },
  heroRightCol: {
    width: 95,
    height: 95,
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  heroGraphicImg: {
    width: "100%",
    height: "100%",
    borderRadius: 12
  },
  heroBadgeReact: {
    position: "absolute",
    top: -5,
    left: -5,
    backgroundColor: "#18172B",
    padding: 3,
    borderRadius: 6
  },
  heroBadgeNode: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#18172B",
    padding: 3,
    borderRadius: 6
  },
  heroBadgeMongo: {
    position: "absolute",
    bottom: -5,
    right: -5,
    backgroundColor: "#18172B",
    padding: 3,
    borderRadius: 6
  },
  heroBadgeJs: {
    position: "absolute",
    bottom: -5,
    left: -5,
    backgroundColor: "#F7DF1E",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 5
  },
  heroBadgeJsText: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: "#000000"
  },

  // Hero Stats Row
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    minWidth: 0
  },
  statTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3
  },
  statVal: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#FFFFFF"
  },
  statValSmall: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#FFFFFF"
  },
  statSubText: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: "#C8C4E6"
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: "#A086FD",
    marginTop: 2,
    textAlign: "center"
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)"
  },

  // 3. Feature Highlights Grid
  featuresRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0EFFF",
    ...shadow.soft
  },
  featureCard: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 2
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6
  },
  featureLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    color: "#181725",
    textAlign: "center",
    lineHeight: 12
  },

  // Section Containers
  sectionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0EFFF",
    ...shadow.soft
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: "#181725",
    marginBottom: 8
  },
  aboutText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#4A4A6A",
    lineHeight: 19
  },
  aboutContainer: {
    gap: 8,
    marginTop: 4
  },
  compactAboutBlock: {
    marginBottom: 4
  },
  compactHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3
  },
  compactIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  compactHeaderTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: "#181725"
  },
  compactParagraphText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#4A4A68",
    lineHeight: 19
  },
  autoSubSectionBox: {
    marginTop: 6,
    backgroundColor: "#FBFBFE",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F0EFFF"
  },
  autoSubHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6
  },
  autoSubHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0A6836"
  },
  autoSubHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#181725"
  },
  autoBulletGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4
  },
  autoBulletChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EBE5FF"
  },
  autoBulletChipText: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: "#3A3A54"
  },
  compactWhyCard: {
    backgroundColor: "#FFFBFA",
    borderWidth: 1,
    borderColor: "#FEE8C6",
    borderRadius: 10,
    padding: 10,
    marginTop: 4
  },
  miniAiPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#F0EDFF",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: "auto"
  },
  miniAiPillText: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    color: "#0A6836"
  },
  miniBulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  miniBulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#0A6836"
  },
  miniBulletText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#3A3A54"
  },
  sleekSalaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EBE5FF",
    padding: 12,
    marginTop: 6,
    ...shadow.soft
  },
  sleekSalaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sleekSalaryIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#F0EDFF",
    alignItems: "center",
    justifyContent: "center"
  },
  sleekSalaryTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#181725"
  },
  sleekMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBFBFE",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#F0EFFF"
  },
  sleekMetricCol: {
    flex: 1
  },
  sleekMetricLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: "#7C7C9A"
  },
  sleekMetricVal: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: "#0A6836",
    marginTop: 1
  },
  sleekMetricDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#EBE5FF",
    marginHorizontal: 8
  },
  sleekSectionSubLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: "#525266"
  },
  sleekCompanyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBFBFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F0EFFF"
  },
  sleekCompanyLogo: {
    width: 16,
    height: 16,
    marginRight: 5
  },
  sleekCompanyText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#3A3A54"
  },
  sleekRoleTag: {
    backgroundColor: "#ECF9E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  sleekRoleTagText: {
    fontFamily: fonts.semiBold,
    fontSize: 10.5,
    color: "#2E7D32",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  aiBadgeTagTextWhite: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: "#0A6836"
  },
  salaryStatsFlex: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  salaryBoxHero: {
    flex: 1
  },
  salaryBoxHeroRight: {
    flex: 1,
    alignItems: "flex-end"
  },
  salaryBoxHeroLabel: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: "#D0C9FF"
  },
  salaryBoxHeroVal: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#00E676",
    marginTop: 3
  },
  salaryBoxHeroValGreen: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#FFD700",
    marginTop: 3
  },
  companiesSection: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EFFF"
  },
  subMetaLabelBold: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#181725",
    marginBottom: 8
  },
  companiesLogoScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 10
  },
  companyLogoCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0EFFF",
    minWidth: 70,
    ...shadow.soft
  },
  companyRealLogoImg: {
    width: 32,
    height: 32,
    marginBottom: 4
  },
  companyLogoNameText: {
    fontFamily: fonts.semiBold,
    fontSize: 10.5,
    color: "#4A4A6A"
  },
  rolesSection: {
    padding: 14
  },
  rolePillGradient: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EDFF",
    borderWidth: 1,
    borderColor: "#E5DEFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10
  },
  rolePillTextGradient: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    color: "#0A6836"
  },
  aiBadgeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F0EDFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  aiBadgeTagText: {
    fontFamily: fonts.semiBold,
    fontSize: 9.5,
    color: "#0A6836"
  },
  aiBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  aiBulletDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#0A6836",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  aiBulletText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: "#3A3A54",
    lineHeight: 18
  },
  salaryHighlightsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6
  },
  salaryStatBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EAF5FF",
    ...shadow.soft
  },
  salaryStatLabel: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: "#7C7C9A"
  },
  salaryStatVal: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: "#0A6836",
    marginTop: 2
  },
  subMetaLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: "#525266",
    marginBottom: 4
  },
  pillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  companyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EDFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  companyPillText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: "#0A6836"
  },
  rolePill: {
    backgroundColor: "#ECF9E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  rolePillText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: "#2E7D32"
  },
  readMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8
  },
  readMoreText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#0A6836"
  },

  // 5. What you'll learn Grid
  learnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 10,
    columnGap: 10
  },
  learnItemRow: {
    width: "48%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F0EDFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  learnItemText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#4A4A6A",
    lineHeight: 16
  },

  // 6. Course Curriculum
  curriculumHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  curriculumSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#7C7C9A",
    marginTop: -4
  },
  expandAllText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#0A6836"
  },

  moduleCard: {
    backgroundColor: "#F8F7FF",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EAE7FF",
    overflow: "hidden"
  },
  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12
  },
  moduleHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  moduleNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0A6836",
    alignItems: "center",
    justifyContent: "center"
  },
  moduleNumText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#FFFFFF"
  },
  moduleTitleText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#181725",
    flex: 1
  },
  moduleHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  lessonsCountText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#7C7C9A"
  },

  lessonsList: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#EAE7FF"
  },
  lessonItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EFFF"
  },
  lessonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1
  },
  timelineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#0A6836"
  },
  playIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F0EDFF",
    alignItems: "center",
    justifyContent: "center"
  },
  lessonTitleText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#181725",
    flex: 1
  },
  lessonDurationText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#7C7C9A"
  },

  // 7. Sticky Bottom Purchase Bar
  stickyPurchaseBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F0EFFF",
    zIndex: 9999,
    elevation: 10,
    ...shadow.soft
  },
  priceCol: {},
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  currentPriceText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: "#181725"
  },
  originalPriceText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#9A9A9A",
    textDecorationLine: "line-through"
  },
  discountPill: {
    backgroundColor: "#ECF9E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  discountPillText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#2E7D32"
  },
  priceTaxesText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "#7C7C9A",
    marginTop: 1
  },

  stickyEnrollBtn: {
    backgroundColor: "#0A6836",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    ...shadow.soft
  },
  stickyEnrollBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#FFFFFF"
  }
});
