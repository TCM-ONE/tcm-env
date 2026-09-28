import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Feather, FontAwesome, FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ViewAllMentorsModal from "../components/ViewAllMentorsModal";
import AiRoadmapPlannerModal from "../components/AiRoadmapPlannerModal";
import TcmAiExamModal from "../components/TcmAiExamModal";
import { getContinueLearningDetails, saveExamResult } from "../api/client";
import { colors, shadow } from "../constants/theme";
import { fonts } from "../constants/fonts";
import { useTheme } from "../context/ThemeContext";
import RazorpayPaymentModal from "../components/RazorpayPaymentModal";
import ComingSoonCategoryModal from "../components/ComingSoonCategoryModal";
import MockTestCard from "../components/mockTest/MockTestCard";

const { width } = Dimensions.get("window");

const defaultHeroBanners = [
  {
    id: "b_neet",
    tag: "NEET 2026 LIVE",
    title: "NEET Ultimate\nCrash Course 2026",
    subtitle: "Physics • Chemistry • Biology • 5000+ MCQs & Mock Tests",
    buttonText: "Join NEET Batch →",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "b_jee",
    tag: "JEE MAIN & ADV",
    title: "JEE Rank Booster\nBatch 2026",
    subtitle: "Advanced Maths • Physics • Organic Chemistry • IITian Mentors",
    buttonText: "Enroll for JEE →",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "b1",
    tag: "NEW BATCH",
    title: "Full Stack\nDevelopment",
    subtitle: "Live Classes • Projects • Placement Support",
    buttonText: "Explore Course →",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "b2",
    tag: "POPULAR",
    title: "Data Science\n& AI Masterclass",
    subtitle: "Python • Pandas • Machine Learning • LLMs",
    buttonText: "Join Batch →",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80"
  }
];

const defaultContinueLearning = [];
const defaultPopularCourses = [];

const defaultTopCategories = [
  {
    id: "cat1",
    name: "Programming & IT",
    coursesCount: "124 Courses",
    icon: "code-tags",
    color: "#0A6836",
    bgColor: "#E8F5E9",
    isUnlocked: true
  },
  {
    id: "cat2",
    name: "Data Science & AI",
    coursesCount: "86 Courses",
    icon: "chart-line",
    color: "#2E7D32",
    bgColor: "#ECF9E9",
    isUnlocked: true
  },
  {
    id: "cat3",
    name: "Web Development",
    coursesCount: "95 Courses",
    icon: "web",
    color: "#2F79B9",
    bgColor: "#EAF5FF",
    isUnlocked: true
  },
  {
    id: "cat4",
    name: "Design & UX",
    coursesCount: "Coming Soon",
    icon: "palette-outline",
    color: "#E76F51",
    bgColor: "#FFF2EE",
    isUnlocked: false
  },
  {
    id: "cat5",
    name: "Mobile App Dev",
    coursesCount: "54 Courses",
    icon: "cellphone",
    color: "#00A6A6",
    bgColor: "#E6F7F7",
    isUnlocked: true
  },
  {
    id: "cat6",
    name: "NEET & JEE Prep",
    coursesCount: "Coming Soon",
    icon: "book-open-outline",
    color: "#9C27B0",
    bgColor: "#FBEAFE",
    isUnlocked: false
  }
];

const defaultExpertMentors = [];

function safeImageUri(url, fallback = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=640&q=80") {
  if (!url || typeof url !== "string") return fallback;
  if (url.startsWith("blob:") || url.includes("blob:http")) return fallback;
  if (Platform.OS === "web" && url.startsWith("file://")) return fallback;
  return url;
}

export default function LearnScreen({ learn = {}, user = {}, session, onOpenSidebar, onNotifications, onSelectUser, onSelectCourse, onOpenContinueLearning, onOpenPopularCourses, onOpenAllMentors, onOpenExploreCategory, onOpenDiscoverPartners, onOpenGovPrep, onOpenGovExams, onOpenMockTests, onBack }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [allMentorsModalVisible, setAllMentorsModalVisible] = useState(false);
  const [roadmapModalVisible, setRoadmapModalVisible] = useState(false);
  const [selectedPaymentCourse, setSelectedPaymentCourse] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [comingSoonModalVisible, setComingSoonModalVisible] = useState(false);
  const [comingSoonCatName, setComingSoonCatName] = useState("Medical & Competitive Exams");

  const bannerScrollRef = useRef(null);
  const safeLearn = learn || {};
  const topCategories = (safeLearn.topCategories && safeLearn.topCategories.length) ? safeLearn.topCategories : defaultTopCategories;
  const expertMentors = (safeLearn.expertMentors && safeLearn.expertMentors.length) ? safeLearn.expertMentors : defaultExpertMentors;
  const initialPopular = Array.isArray(safeLearn.popularCourses) ? safeLearn.popularCourses : defaultPopularCourses;

  const [popularCourses, setPopularCourses] = useState(initialPopular);
  const [aiExamModalVisible, setAiExamModalVisible] = useState(false);
  const [continueLearningList, setContinueLearningList] = useState(
    (safeLearn.continueLearning && safeLearn.continueLearning.length) ? safeLearn.continueLearning : []
  );

  // Dynamic Auto-Generated Hero Banners (Exactly 4 Slides)
  const heroBanners = useMemo(() => {
    if (safeLearn.heroBanners && safeLearn.heroBanners.length >= 4) return safeLearn.heroBanners.slice(0, 4);

    const generated = [];
    const sourceCourses = Array.isArray(popularCourses) && popularCourses.length > 0 ? popularCourses : [];

    const tags = ["🔥 FEATURED BATCH", "⭐ TOP RATED 2026", "🚀 HIGH PLACEMENT", "⚡ LIVE INTERACTIVE"];
    const buttons = ["Enroll Now →", "Explore Course →", "Join Batch →", "View Details →"];

    sourceCourses.forEach((c, idx) => {
      if (generated.length < 4) {
        generated.push({
          id: c.id || `gen_c_${idx}`,
          tag: c.badge || c.tag || tags[idx % tags.length],
          title: c.title ? String(c.title).replace(" - ", "\n") : "Live Batch Course",
          subtitle: `${c.category || "Professional Course"} • ${c.rating || "4.9 ⭐"} (${c.studentsCount || "1.2k+ Students"})`,
          buttonText: buttons[idx % buttons.length],
          image: safeImageUri(c.image || c.imageUrl || c.thumbnailUrl || defaultHeroBanners[idx % defaultHeroBanners.length].image)
        });
      }
    });

    let fallbackIdx = 0;
    while (generated.length < 4) {
      const fb = defaultHeroBanners[fallbackIdx % defaultHeroBanners.length];
      if (!generated.some((item) => item.id === fb.id)) {
        generated.push(fb);
      }
      fallbackIdx++;
    }

    return generated.slice(0, 4);
  }, [safeLearn.heroBanners, popularCourses]);

  // Auto-scroll Slider every 4.5 seconds
  useEffect(() => {
    if (!heroBanners || heroBanners.length <= 1) return;

    const interval = setInterval(() => {
      setActiveBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % heroBanners.length;
        if (bannerScrollRef.current) {
          try {
            bannerScrollRef.current.scrollTo({
              x: nextIndex * (width - 32),
              animated: true
            });
          } catch (e) {}
        }
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [heroBanners]);

  async function handleSaveExamResult(resultData) {
    try {
      const token = (session && session.token) || (user && user.token);
      if (token) {
        await saveExamResult(token, resultData);
      }
    } catch (e) {
      console.error("Could not save exam result:", e);
    }
  }

  useEffect(() => {
    if (Array.isArray(learn && learn.popularCourses)) {
      setPopularCourses(learn.popularCourses);
    }
  }, [learn && learn.popularCourses]);

  useEffect(() => {
    loadRealContinueLearningData();
  }, [session && session.token]);

  async function loadRealContinueLearningData() {
    try {
      if (session && session.token) {
        const data = await getContinueLearningDetails(session.token);
        if (data && !data.noEnrolledCourses && ((data.enrolledCourses && data.enrolledCourses.length) || data.courseTitle)) {
          setContinueLearningList(
            data.enrolledCourses && data.enrolledCourses.length > 0
              ? data.enrolledCourses
              : [
                  {
                    id: data.courseId || "c_active",
                    title: data.courseTitle,
                    subtitle: `Mentor: ${data.mentorName || "Mentor"} • Live Batch Ready`,
                    progress: (data.userProgress && data.userProgress.courseProgress) || 0,
                    icon: "code-tags",
                    iconColor: "#0A6836",
                    bgColor: "#E8F5E9"
                  }
                ]
          );
        } else {
          setContinueLearningList([]);
        }
      } else {
        setContinueLearningList([]);
      }
    } catch (e) {
      setContinueLearningList([]);
    }
  }

  const continueLearning = continueLearningList;

  function toggleBookmark(courseId) {
    setPopularCourses((prev) =>
      prev.map((item) => (item.id === courseId ? { ...item, bookmarked: !item.bookmarked } : item))
    );
  }

  function handleEnroll(course) {
    setSelectedPaymentCourse(course);
    setShowPaymentModal(true);
  }

  function handleScrollBanner(event) {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const activeIndex = Math.round(offset / slideSize);
    setActiveBannerIndex(activeIndex);
  }

  const filteredCourses = popularCourses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return String(c.title || "").toLowerCase().includes(q) || String(c.tags || "").toLowerCase().includes(q);
  });

  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

      <View style={[styles.searchBoxCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Feather name="search" size={18} color={theme.subtext} style={{ marginRight: 10 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search for courses, topics or skills..."
          placeholderTextColor={theme.subtext}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery("")} style={{ marginRight: 6 }}>
            <Feather name="x" size={16} color={theme.subtext} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => Alert.alert("Filter Courses", "Filter by Category, Difficulty & Rating")} style={styles.filterBtn}>
          <MaterialCommunityIcons name="tune-variant" size={18} color="#181725" />
        </Pressable>
      </View>



      {heroBanners.length > 0 ? (
        <View style={styles.bannerContainer}>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScrollBanner}
            scrollEventThrottle={16}
          >
            {heroBanners.map((banner) => (
              <View key={banner.id} style={[styles.bannerCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.bannerLeft}>
                  <View style={[styles.newBatchPill, { backgroundColor: theme.badgeBg }]}>
                    <Text style={[styles.newBatchText, { color: theme.badgeText || theme.primary }]}>{banner.tag}</Text>
                  </View>

                  <Text style={[styles.bannerTitle, { color: theme.text }]}>{banner.title}</Text>
                  <Text style={[styles.bannerSubtitle, { color: theme.subtext }]}>{banner.subtitle}</Text>

                  <Pressable
                    onPress={() => (onSelectCourse ? onSelectCourse(banner.id) : Alert.alert(banner.title.replace("\n", " "), "Opening course details..."))}
                    style={[styles.exploreBtn, { backgroundColor: theme.primary }]}
                  >
                    <Text style={styles.exploreBtnText}>{banner.buttonText}</Text>
                  </Pressable>
                </View>

                <View style={styles.bannerRight}>
                  <Image source={{ uri: safeImageUri(banner.image) }} style={styles.bannerGraphic} />
                  <View style={styles.techBadgeReact}>
                    <MaterialCommunityIcons name="react" size={18} color="#00D8FF" />
                  </View>
                  <View style={styles.techBadgeNode}>
                    <MaterialCommunityIcons name="nodejs" size={18} color="#68A063" />
                  </View>
                  <View style={styles.techBadgeJs}>
                    <Text style={styles.techBadgeJsText}>JS</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dotsRow}>
            {heroBanners.map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: theme.border }, i === activeBannerIndex && [styles.activeDot, { backgroundColor: theme.primary }]]} />
            ))}
          </View>
        </View>
      ) : null}

      {/* 2. Interactive AI Career Roadmap Card */}
      <Pressable
        onPress={() => setRoadmapModalVisible(true)}
        style={({ pressed }) => [
          styles.quickAiRoadmapBar,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.border
          },
          pressed && styles.pressed
        ]}
      >
        <View style={styles.roadmapMainContentRow}>
          <View style={[styles.quickAiBadgeIcon, { backgroundColor: theme.isDark ? (theme.primary + "25") : (theme.primaryLight || "#FCDBDE") }]}>
            <MaterialCommunityIcons name="map-marker-path" size={22} color={theme.primary} />
          </View>

          <View style={{ flex: 1, paddingLeft: 12, paddingRight: 8 }}>
            <Text numberOfLines={1} style={[styles.roadmapMainTitle, { color: theme.text }]}>
              Plan My Learning Roadmap
            </Text>
            <Text numberOfLines={1} style={[styles.roadmapSubTitle, { color: theme.subtext }]}>
              AI-driven personalized career path & skill guide
            </Text>
          </View>

          <View style={[styles.quickAiBtn, { backgroundColor: theme.primary, borderColor: theme.primaryDark || theme.primary, shadowColor: theme.primary }]}>
            <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: "#FFFFFF" }}>Start AI →</Text>
          </View>
        </View>
      </Pressable>

      {/* NEW: MOCK TEST CARD */}
      <MockTestCard
        onPress={() => (onOpenMockTests ? onOpenMockTests() : Alert.alert("Mock Test", "Opening Mock Test module..."))}
      />

      {/* NEW: LEARN FOR GOVERNMENT EXAMS CARD */}
      <Pressable
        onPress={() => (onOpenGovExams ? onOpenGovExams() : Alert.alert("Learn for Government Exams", "Opening Government Exams Page..."))}
        style={({ pressed }) => [
          styles.govPrepCardContainer,
          {
            backgroundColor: theme.isDark ? "#0A192F" : "#EFF6FF",
            borderColor: theme.isDark ? "#1E293B" : "#BFDBFE"
          },
          pressed && styles.pressed
        ]}
      >
        <View style={styles.govCardContent}>
          <View style={styles.govBadgeRow}>
            <View style={[styles.govBadgePill, { backgroundColor: theme.isDark ? "#1E293B" : "#FFFFFF", borderColor: theme.isDark ? "#334155" : "#DBEAFE" }]}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={14} color="#0284C7" />
              <Text style={[styles.govBadgeLabel, { color: "#0284C7", fontFamily: fonts.bold }]}>
                Government Preparation
              </Text>
            </View>
          </View>
          <Text style={[styles.govCardMainTitle, { color: theme.isDark ? "#FFFFFF" : "#0F172A" }]}>
            Learn for Government Exams
          </Text>
          <Text style={[styles.govCardSubText, { color: theme.isDark ? "#94A3B8" : "#475569" }]}>
            Prepare smarter with exam-wise subjects, chapters, notes, and real study material.
          </Text>
          <View style={styles.govCardFooterRow}>
            <Pressable
              onPress={() => (onOpenGovExams ? onOpenGovExams() : Alert.alert("Learn for Government Exams", "Opening Government Exams Page..."))}
              style={({ pressed }) => [
                styles.govStartPracticeBtn,
                { backgroundColor: "#0284C7" },
                pressed && { opacity: 0.85 }
              ]}
            >
              <Text style={[styles.govStartPracticeText, { color: "#FFFFFF", fontFamily: fonts.bold }]}>
                Start Learning →
              </Text>
            </Pressable>
            <View style={[styles.govTagPill, { backgroundColor: theme.isDark ? "#1E293B" : "#FFFFFF", borderColor: theme.isDark ? "#334155" : "#DBEAFE" }]}>
              <MaterialCommunityIcons name="shield-check-outline" size={13} color={theme.isDark ? "#94A3B8" : "#64748B"} />
              <Text style={[styles.govTagPillText, { color: theme.isDark ? "#94A3B8" : "#64748B" }]}>
                Free & Official Books
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* GOVERNMENT PREPARATION SECTION CARD */}
      <Pressable
        onPress={() => (onOpenGovPrep ? onOpenGovPrep() : Alert.alert("Government Preparation", "Opening Government Exam Module..."))}
        style={({ pressed }) => [
          styles.govPrepCardContainer,
          {
            backgroundColor: theme.isDark ? "#09090B" : "#F4F4F5",
            borderColor: theme.isDark ? "#27272A" : "#E4E4E7"
          },
          pressed && styles.pressed
        ]}
      >
        <View style={styles.govCardContent}>
          <View style={styles.govBadgeRow}>
            <View style={[styles.govBadgePill, { backgroundColor: theme.isDark ? "#18181B" : "#FFFFFF", borderColor: theme.isDark ? "#27272A" : "#E4E4E7" }]}>
              <MaterialCommunityIcons name="bank" size={13} color={theme.isDark ? "#FFFFFF" : "#09090B"} />
              <Text style={[styles.govBadgeLabel, { color: theme.isDark ? "#FFFFFF" : "#09090B" }]}>
                OFFICIAL PYQS & PRACTICE
              </Text>
            </View>
          </View>
          <Text style={[styles.govCardMainTitle, { color: theme.isDark ? "#FFFFFF" : "#09090B" }]}>
            Government Exam Preparation
          </Text>
          <Text style={[styles.govCardSubText, { color: theme.isDark ? "#A1A1AA" : "#52525B" }]}>
            Official PYQs for SSC, Railway, Banking, UPSC & State Exams with AI solutions.
          </Text>
          <View style={styles.govCardFooterRow}>
            <Pressable
              onPress={() => (onOpenGovPrep ? onOpenGovPrep() : Alert.alert("Government Preparation", "Opening Government Exam Module..."))}
              style={({ pressed }) => [
                styles.govStartPracticeBtn,
                { backgroundColor: theme.isDark ? "#FFFFFF" : "#09090B" },
                pressed && { opacity: 0.85 }
              ]}
            >
              <Text style={[styles.govStartPracticeText, { color: theme.isDark ? "#09090B" : "#FFFFFF" }]}>
                Start Practice →
              </Text>
            </Pressable>
            <View style={[styles.govTagPill, { backgroundColor: theme.isDark ? "#18181B" : "#FFFFFF", borderColor: theme.isDark ? "#27272A" : "#E4E4E7" }]}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={13} color={theme.isDark ? "#A1A1AA" : "#52525B"} />
              <Text style={[styles.govTagPillText, { color: theme.isDark ? "#A1A1AA" : "#52525B" }]}>
                1,250+ PYQs & Mocks
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      <View style={styles.exploreTcmSection}>
        <Text style={[styles.exploreTcmHeaderTitle, { color: theme.text }]}>Explore TCM One</Text>
        <View style={styles.exploreTcmGrid}>
          {/* 1. IT & Tech - UNLOCKED */}
          <Pressable
            onPress={() => (onOpenExploreCategory ? onOpenExploreCategory("inform") : Alert.alert("TCM One Tech", "Opening Live IT Classes & Projects..."))}
            style={({ pressed }) => [styles.exploreTcmCard, { backgroundColor: theme.cardBg, borderColor: theme.border }, pressed && styles.pressed]}
          >
            <View style={styles.exploreTcmHeaderRow}>
              <View style={[styles.exploreIconBox, { backgroundColor: theme.isDark ? "#1E1B4B" : "#EEECFE" }]}>
                <MaterialCommunityIcons name="code-tags" size={20} color={theme.isDark ? "#A78BFA" : "#0A6836"} />
              </View>
              <View style={{ backgroundColor: "#E8F5E9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 9, fontFamily: fonts.bold, color: "#0A6836" }}>UNLOCKED</Text>
              </View>
            </View>
            <Text style={[styles.exploreTcmTitle, { color: theme.text }]}>TCM One IT & Tech</Text>
            <Text style={[styles.exploreTcmSub, { color: theme.subtext }]}>Live Classes & Projects</Text>
          </Pressable>

          {/* 2. Academy (NEET/JEE) - LOCKED (COMING SOON) */}
          <Pressable
            onPress={() => {
              setComingSoonCatName("NEET, JEE & School Academy");
              setComingSoonModalVisible(true);
            }}
            style={({ pressed }) => [styles.exploreTcmCard, { backgroundColor: theme.cardBg, borderColor: theme.border }, pressed && styles.pressed]}
          >
            <View style={styles.exploreTcmHeaderRow}>
              <View style={[styles.exploreIconBox, { backgroundColor: theme.isDark ? "#064E3B" : "#FEE2E2" }]}>
                <MaterialCommunityIcons name="school" size={20} color="#D13B45" />
              </View>
              <View style={{ backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Feather name="lock" size={9} color="#D13B45" />
                <Text style={{ fontSize: 9, fontFamily: fonts.bold, color: "#D13B45" }}>SOON</Text>
              </View>
            </View>
            <Text style={[styles.exploreTcmTitle, { color: theme.text }]}>TCM One Academy</Text>
            <Text style={[styles.exploreTcmSub, { color: theme.subtext }]}>NEET & JEE Prep (Soon)</Text>
          </Pressable>

          {/* 3. Government Preparation - UNLOCKED */}
          <Pressable
            onPress={() => (onOpenGovPrep ? onOpenGovPrep() : Alert.alert("Government Preparation", "Opening Government Exam Module..."))}
            style={({ pressed }) => [styles.exploreTcmCard, { backgroundColor: theme.cardBg, borderColor: theme.border }, pressed && styles.pressed]}
          >
            <View style={styles.exploreTcmHeaderRow}>
              <View style={[styles.exploreIconBox, { backgroundColor: theme.isDark ? "#78350F" : "#FFF8EC" }]}>
                <MaterialCommunityIcons name="bank" size={20} color={theme.isDark ? "#FBBF24" : "#E7A900"} />
              </View>
              <View style={{ backgroundColor: "#E8F5E9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 9, fontFamily: fonts.bold, color: "#0A6836" }}>UNLOCKED</Text>
              </View>
            </View>
            <Text style={[styles.exploreTcmTitle, { color: theme.text }]}>Government Prep</Text>
            <Text style={[styles.exploreTcmSub, { color: theme.subtext }]}>SSC, Railway, UPSC & Banking</Text>
          </Pressable>

          {/* 4. IT Placement Track - UNLOCKED */}
          <Pressable
            onPress={() => (onOpenExploreCategory ? onOpenExploreCategory("inform") : Alert.alert("TCM One IT Placements", "Opening IT Jobs & Placement Track..."))}
            style={({ pressed }) => [styles.exploreTcmCard, { backgroundColor: theme.cardBg, borderColor: theme.border }, pressed && styles.pressed]}
          >
            <View style={styles.exploreTcmHeaderRow}>
              <View style={[styles.exploreIconBox, { backgroundColor: theme.isDark ? "#1E3A8A" : "#EBF5FF" }]}>
                <MaterialCommunityIcons name="briefcase" size={20} color={theme.isDark ? "#60A5FA" : "#2F79B9"} />
              </View>
              <View style={{ backgroundColor: "#EAF5FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 9, fontFamily: fonts.bold, color: "#2F79B9" }}>UNLOCKED</Text>
              </View>
            </View>
            <Text style={[styles.exploreTcmTitle, { color: theme.text }]}>TCM One IT Career</Text>
            <Text style={[styles.exploreTcmSub, { color: theme.subtext }]}>Software Placements</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitleText, { color: theme.text }]}>Continue Learning</Text>
        <Pressable onPress={() => (onOpenContinueLearning ? onOpenContinueLearning() : Alert.alert("Continue Learning", "Showing all active enrolled courses."))}>
          <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
        </Pressable>
      </View>

      {continueLearning && continueLearning.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
          {continueLearning.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => (onOpenContinueLearning ? onOpenContinueLearning() : onSelectCourse ? onSelectCourse(item.id) : null)}
              style={[styles.continueCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            >
              <View style={styles.continueTopRow}>
                <View style={[styles.continueIconWrap, { backgroundColor: item.bgColor || (theme.isDark ? "#1E1B4B" : "#E8F5E9") }]}>
                  <MaterialCommunityIcons name={item.icon || "book-open"} size={22} color={item.iconColor || theme.primary} />
                </View>
                <View style={[styles.playCircleBtn, { backgroundColor: theme.isDark ? "#1E1B4B" : "#E8F5E9" }]}>
                  <Feather name="play" size={11} color={theme.primary} style={{ marginLeft: 1 }} />
                </View>
              </View>

              <Text style={[styles.continueTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>

              <View style={styles.progressContainer}>
                <View style={[styles.progressTrackBg, { backgroundColor: theme.isDark ? "#1E263B" : "#EFEFFF" }]}>
                  <View style={[styles.progressFillBar, { width: `${item.progress}%`, backgroundColor: theme.primary }]} />
                </View>
                <Text style={[styles.progressPercentText, { color: theme.subtext }]}>{item.progress}% Completed</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.emptyContinueCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: theme.badgeBg }]}>
            <MaterialCommunityIcons name="book-open-outline" size={24} color={theme.primary} />
          </View>
          <View style={styles.emptyTextCol}>
            <Text style={[styles.emptyContinueTitle, { color: theme.text }]}>No Learning Started Yet</Text>
            <Text style={[styles.emptyContinueSub, { color: theme.subtext }]}>You haven't enrolled in any active course yet. Explore courses below to start!</Text>
          </View>
        </View>
      )}

      {/* OUR TRUSTED PARTNERS CARD - Compact Vector Illustration */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitleText, { color: theme.text }]}>Trusted Partners & Collaborators</Text>
        <Pressable onPress={() => (onOpenDiscoverPartners ? onOpenDiscoverPartners() : Alert.alert("Discover Partners", "Opening all partners list..."))}>
          <Text style={[styles.viewAllText, { color: theme.primary }]}>View All →</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => (onOpenDiscoverPartners ? onOpenDiscoverPartners() : Alert.alert("Discover Partners", "Opening all partners list..."))}
        style={({ pressed }) => [
          {
            backgroundColor: theme.isDark ? "#1E1B4B20" : "#F0EDFF",
            borderRadius: 16,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.isDark ? "#4338CA40" : "#C7D2FE",
            marginBottom: 20,
            ...shadow.soft
          },
          pressed && { opacity: 0.92 }
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* Compact Vector Art Emblem Left */}
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "#5B3CF5",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#5B3CF5",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 5,
            elevation: 3
          }}>
            <MaterialCommunityIcons name="domain" size={24} color="#FFFFFF" />
          </View>

          {/* Right Vector Info Wrap */}
          <View style={{ flex: 1 }}>
            {/* Top Badges Row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <View style={{ backgroundColor: theme.isDark ? "#312E81" : "#E0E7FF", paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                <Text style={{ color: "#4F46E5", fontFamily: fonts.bold, fontSize: 8.5, letterSpacing: 0.3 }}>
                  ACCREDITED NETWORK
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: theme.text || colors.ink, marginBottom: 1 }}>
              Trusted Partners & Collaborators
            </Text>
            <Text style={{ fontSize: 10, fontFamily: fonts.regular, color: theme.subtext || colors.muted }} numberOfLines={1}>
              Verified IT labs & campus centers near you.
            </Text>
          </View>
        </View>

        {/* Compact Footer Vector Action Row (No Overflow!) */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: theme.cardBg || colors.card,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 7,
          marginTop: 10,
          borderWidth: 1,
          borderColor: theme.border || colors.border
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1, marginRight: 6 }}>
            <MaterialCommunityIcons name="office-building-marker-outline" size={14} color="#5B3CF5" />
            <Text style={{ fontSize: 10, fontFamily: fonts.semiBold, color: theme.text || colors.ink }} numberOfLines={1}>
              50+ Colleges • IT Labs • Hubs
            </Text>
          </View>

          <View style={{ backgroundColor: "#5B3CF5", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Text style={{ fontSize: 10.5, fontFamily: fonts.bold, color: "#FFFFFF" }}>Explore</Text>
            <Feather name="arrow-right" size={11} color="#FFFFFF" />
          </View>
        </View>
      </Pressable>

      {/* TCM ONE AI EXAMINATIONS CARD - Vector Illustration Concept */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitleText, { color: theme.text }]}>TCM One AI Examinations</Text>
        <Pressable onPress={() => setAiExamModalVisible(true)}>
          <Text style={[styles.viewAllText, { color: theme.primary }]}>Take Exam →</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => setAiExamModalVisible(true)}
        style={({ pressed }) => [
          {
            backgroundColor: theme.isDark ? "#064E3B18" : "#ECFDF5",
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.isDark ? "#05966940" : "#A7F3D0",
            marginBottom: 20,
            ...shadow.soft
          },
          pressed && { opacity: 0.92 }
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {/* Vector Art Emblem Left */}
          <View style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 4
          }}>
            <MaterialCommunityIcons name="head-lightbulb-outline" size={28} color="#FFFFFF" />
          </View>

          {/* Right Vector Info Wrap */}
          <View style={{ flex: 1 }}>
            {/* Top Badges Row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <View style={{ backgroundColor: theme.isDark ? "#064E3B" : colors.mint, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                <Text style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.3 }}>
                  AI EVALUATION
                </Text>
              </View>
              <View style={{ backgroundColor: theme.isDark ? "#1E293B" : "#E2E8F0", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                <Text style={{ color: theme.subtext || colors.muted, fontFamily: fonts.bold, fontSize: 8.5 }}>ON-DEMAND</Text>
              </View>
            </View>

            <Text style={{ fontSize: 13.5, fontFamily: fonts.bold, color: theme.text || colors.ink, marginBottom: 2 }}>
              TCM One AI Skill Examinations & Scorecards
            </Text>
            <Text style={{ fontSize: 10.5, fontFamily: fonts.regular, color: theme.subtext || colors.muted }} numberOfLines={1}>
              10-minute adaptive test with instant AI scorecard & certificate.
            </Text>
          </View>
        </View>

        {/* Footer Vector Action Row */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: theme.cardBg || colors.card,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginTop: 12,
          borderWidth: 1,
          borderColor: theme.border || colors.border
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialCommunityIcons name="clock-fast" size={15} color={colors.primary} />
            <Text style={{ fontSize: 10.5, fontFamily: fonts.semiBold, color: theme.text || colors.ink }}>
              6 Mins • 10 MCQs • Instant Result
            </Text>
          </View>

          <View style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: "#FFFFFF" }}>Start Exam</Text>
            <Feather name="arrow-right" size={12} color="#FFFFFF" />
          </View>
        </View>
      </Pressable>

      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitleText, { color: theme.text }]}>Popular Courses</Text>
        <Pressable onPress={() => (onOpenPopularCourses ? onOpenPopularCourses() : Alert.alert("Popular Courses", "Showing all popular featured courses."))}>
          <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
        </Pressable>
      </View>

      {filteredCourses && filteredCourses.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
          {filteredCourses.map((course) => (
            <Pressable key={course.id} onPress={() => (onSelectCourse ? onSelectCourse(course.id) : handleEnroll(course))} style={[styles.popularCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={styles.popularImageWrap}>
                <Image source={{ uri: safeImageUri(course.image) }} style={styles.popularImage} />
                <Pressable onPress={() => toggleBookmark(course.id)} style={[styles.bookmarkBadge, { backgroundColor: theme.isDark ? "rgba(17,22,37,0.9)" : "rgba(255, 255, 255, 0.9)" }]}>
                  <Feather name="bookmark" size={14} color={course.bookmarked ? theme.primary : theme.text} fill={course.bookmarked ? theme.primary : "none"} />
                </Pressable>
              </View>

              <View style={styles.popularBody}>
                <Text style={[styles.popularTitle, { color: theme.text }]} numberOfLines={2}>{course.title}</Text>
                <Text style={[styles.popularTags, { color: theme.subtext }]} numberOfLines={1}>{course.tags}</Text>

                <View style={styles.popularMetaRow}>
                  <View style={styles.metaRating}>
                    <FontAwesome name="star" size={12} color="#FFB800" />
                    <Text style={[styles.ratingValText, { color: theme.text }]}>{course.rating}</Text>
                    <Text style={[styles.reviewsText, { color: theme.subtext }]}>({course.reviews})</Text>
                  </View>
                  <Text style={[styles.metaDot, { color: theme.subtext }]}>•</Text>
                  <Text style={[styles.lessonsText, { color: theme.subtext }]}>{course.lessons}</Text>
                </View>

                <Pressable onPress={() => handleEnroll(course)} style={[styles.enrollBtn, { backgroundColor: theme.badgeBg, borderColor: theme.border }]}>
                  <Text style={[styles.enrollBtnText, { color: theme.primary }]}>Enroll Now</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.emptyPopularCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <MaterialCommunityIcons name="magnify-remove-outline" size={32} color={theme.subtext} />
          <Text style={[styles.emptyPopularTitle, { color: theme.text }]}>No Courses Found</Text>
          <Text style={[styles.emptyPopularSub, { color: theme.subtext }]}>No courses match "{searchQuery}". Try searching for 'Python', 'Web Dev', or 'AI'.</Text>
          <Pressable onPress={() => setSearchQuery("")} style={[styles.clearSearchBtn, { backgroundColor: theme.badgeBg, borderColor: theme.border }]}>
            <Text style={[styles.clearSearchText, { color: theme.primary }]}>Clear Search</Text>
          </Pressable>
        </View>
      )}

      {expertMentors.length > 0 ? (
        <React.Fragment>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitleText, { color: theme.text }]}>Our Expert Mentors</Text>
            <Pressable onPress={() => (onOpenAllMentors ? onOpenAllMentors() : setAllMentorsModalVisible(true))}>
              <Text style={[styles.viewAllText, { color: theme.primary }]}>View All Mentors ›</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
            {expertMentors.map((mentor) => {
              const mAvatar = ((user && user.role === "mentor") || (user && user.isMentor)) ? (user.avatarUrl || mentor.avatarUrl) : mentor.avatarUrl;
              const hasRealAvatar = Boolean(mAvatar && typeof mAvatar === "string" && mAvatar.trim().length > 5);
              const initials = (mentor.name || "Mentor").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "M";

              return (
                <Pressable
                  key={mentor.id}
                  onPress={() => (onSelectUser ? onSelectUser({ id: mentor.id, name: mentor.name, avatarUrl: mentor.avatarUrl, role: "mentor", isMentorCard: true }) : null)}
                  style={[styles.mentorCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                >
                  <View style={styles.mentorTopRow}>
                    <View style={styles.mentorAvatarWrap}>
                      {hasRealAvatar ? (
                        <Image source={{ uri: mAvatar }} style={styles.mentorAvatarImg} />
                      ) : (
                        <View style={[styles.mentorAvatarImg, { backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }]}>
                          <Text style={{ fontSize: 15, fontFamily: fonts.bold, color: "#FFFFFF" }}>{initials}</Text>
                        </View>
                      )}
                      <View style={styles.onlineDot} />
                    </View>

                    <View style={styles.mentorInfoCol}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Text style={[styles.mentorCardName, { color: theme.text, flexShrink: 1 }]} numberOfLines={1}>
                          {mentor.name}
                        </Text>
                        {mentor.isPremium ? (
                          <MaterialCommunityIcons name="check-decagram" size={13} color={theme.primary} />
                        ) : null}
                      </View>
                      <Text style={[styles.mentorCardRole, { color: theme.subtext }]} numberOfLines={1}>
                        {mentor.role}
                      </Text>
                      {mentor.badge ? (
                        <View style={[styles.mentorBadgePill, { backgroundColor: theme.badgeBg }]}>
                          <Text style={[styles.mentorBadgeText, { color: theme.primary }]} numberOfLines={1}>
                            {mentor.badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                <View style={styles.mentorMetaRow}>
                  <View style={styles.mentorRatingRow}>
                    <FontAwesome name="star" size={11} color="#FFB800" />
                    <Text style={[styles.mentorRatingVal, { color: theme.text }]}>{mentor.rating}</Text>
                    <Text style={[styles.mentorReviewsVal, { color: theme.subtext }]}>({mentor.reviews})</Text>
                  </View>
                  <Text style={[styles.mentorExpText, { color: theme.subtext }]}>{mentor.experience}</Text>
                </View>

                <View
                  style={[styles.viewProfileBtn, { backgroundColor: theme.badgeBg, borderColor: theme.border, borderWidth: 1 }]}
                >
                  <Text style={[styles.viewProfileBtnText, { color: theme.primary }]}>View Profile</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        </React.Fragment>
      ) : null}

      <ViewAllMentorsModal
        visible={allMentorsModalVisible}
        session={session || { token: user && user.token }}
        onClose={() => setAllMentorsModalVisible(false)}
        onSelectMentor={(mId) => {
          setAllMentorsModalVisible(false);
          if (onSelectUser) onSelectUser({ id: mId, role: "mentor" });
        }}
      />
      
      <AiRoadmapPlannerModal
        visible={roadmapModalVisible}
        user={user}
        courses={popularCourses}
        mentors={expertMentors}
        onClose={() => setRoadmapModalVisible(false)}
        onSelectUser={onSelectUser}
      />

      <RazorpayPaymentModal
        visible={showPaymentModal}
        course={selectedPaymentCourse}
        onClose={() => setShowPaymentModal(false)}
      />

      <TcmAiExamModal
        visible={aiExamModalVisible}
        onClose={() => setAiExamModalVisible(false)}
        user={user}
        onSaveResult={handleSaveExamResult}
        onOpenProfile={() => {
          setAiExamModalVisible(false);
          if (onSelectUser) onSelectUser(user);
        }}
      />

      {topCategories.length > 0 ? (
        <React.Fragment>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitleText, { color: theme.text }]}>Top Categories</Text>
            <Pressable onPress={() => Alert.alert("Top Categories", "Browse all 18 learning categories.")}>
              <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
            {topCategories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => {
                  if (cat.isUnlocked === false) {
                    setComingSoonCatName(cat.name);
                    setComingSoonModalVisible(true);
                  } else {
                    if (onOpenExploreCategory) {
                      onOpenExploreCategory("inform");
                    } else {
                      Alert.alert(cat.name, `Exploring ${cat.name} live courses...`);
                    }
                  }
                }}
                style={[styles.categoryCard, { backgroundColor: theme.cardBg, borderColor: theme.border, position: "relative" }]}
              >
                {cat.isUnlocked === false ? (
                  <View style={{ position: "absolute", top: 6, right: 6, backgroundColor: "#FEE2E2", borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 }}>
                    <Feather name="lock" size={10} color="#D13B45" />
                  </View>
                ) : null}
                <View style={[styles.categoryIconWrap, { backgroundColor: cat.bgColor || (theme.isDark ? "#1E1B4B" : "#E8F5E9") }]}>
                  <MaterialCommunityIcons name={cat.icon || "code-tags"} size={22} color={cat.color || theme.primary} />
                </View>
                <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={1}>{cat.name}</Text>
                <Text style={[styles.categoryCount, { color: theme.subtext }]}>{cat.coursesCount || "12+ Courses"}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </React.Fragment>
      ) : null}
      </ScrollView>

      <ComingSoonCategoryModal
        visible={comingSoonModalVisible}
        categoryName={comingSoonCatName}
        onClose={() => setComingSoonModalVisible(false)}
        onExploreIt={() => {
          setComingSoonModalVisible(false);
          if (onOpenExploreCategory) onOpenExploreCategory("inform");
        }}
        onNotify={(cat) => {
          Alert.alert("Preference Recorded 🔔", `We'll notify you as soon as ${cat} course batches launch on TCM One!`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%"
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 110,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center"
  },

  // 1. Top Header Bar
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.06)",
    position: Platform.OS === "web" ? "sticky" : "relative",
    top: 0,
    zIndex: 100,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)"
        }
      : {})
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  titleWrap: {
    justifyContent: "center"
  },
  screenTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: -0.2,
    color: "#181725"
  },
  screenSub: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    color: "#7C7C9A",
    marginTop: 0,
    letterSpacing: 0
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0A6836"
  },

  // 2. Search Box Card
  searchBoxCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F0EFFF",
    ...shadow.soft
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#181725"
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F4F3FA",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6
  },

  // 3. Hero Carousel Banner
  bannerContainer: {
    marginBottom: 22
  },
  bannerCard: {
    width: Math.min(width - 28, 640),
    maxWidth: "100%",
    backgroundColor: "#E8F5E9",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E1FF"
  },
  bannerLeft: {
    flex: 1.1,
    paddingRight: 8
  },
  newBatchPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E4DCFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8
  },
  newBatchText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#0A6836",
    letterSpacing: 0.6
  },
  bannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: "#181725",
    lineHeight: 20,
    marginBottom: 4
  },
  bannerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#52506E",
    marginBottom: 14,
    lineHeight: 16
  },
  exploreBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#0A6836",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    ...shadow.soft
  },
  exploreBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#FFFFFF"
  },

  bannerRight: {
    flex: 0.9,
    height: 125,
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  bannerGraphic: {
    width: "100%",
    height: "100%",
    borderRadius: 12
  },
  quickAiRoadmapBar: {
    width: "100%",
    alignSelf: "stretch",
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadow.soft
  },
  roadmapCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  aiSparkleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  aiSparkleText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 0.6
  },
  roadmapLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981"
  },
  liveBadgeText: {
    fontSize: 10.5,
    fontFamily: fonts.semiBold
  },
  roadmapMainContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  quickAiBadgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center"
  },
  roadmapMainTitle: {
    fontSize: 14.5,
    fontFamily: fonts.bold,
    lineHeight: 20
  },
  roadmapSubTitle: {
    fontSize: 11,
    fontFamily: fonts.medium,
    lineHeight: 15,
    marginTop: 1
  },
  roadmapChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6
  },
  roadmapChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1
  },
  roadmapChipText: {
    fontSize: 10,
    fontFamily: fonts.semiBold
  },
  quickAiBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6D28D9",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2
  },
  roadmapCardBanner: {
    marginHorizontal: 0,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: "#0A6836",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4
  },
  roadmapCardLeft: {
    flex: 1,
    paddingRight: 10
  },
  aiBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8
  },
  aiBadgePillText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#FFFFFF"
  },
  roadmapCardTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#FFFFFF",
    marginBottom: 4
  },
  roadmapCardSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#E0E7FF",
    lineHeight: 17,
    marginBottom: 12
  },
  roadmapCardBtn: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12
  },
  roadmapCardBtnText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#0A6836"
  },
  roadmapCardRight: {
    alignItems: "center",
    justifyContent: "center"
  },
  roadmapIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  techBadgeReact: {
    position: "absolute",
    top: -6,
    left: -6,
    backgroundColor: "#FFFFFF",
    padding: 5,
    borderRadius: 10,
    ...shadow.soft
  },
  techBadgeNode: {
    position: "absolute",
    bottom: -6,
    right: -6,
    backgroundColor: "#FFFFFF",
    padding: 5,
    borderRadius: 10,
    ...shadow.soft
  },
  techBadgeJs: {
    position: "absolute",
    bottom: 8,
    left: -8,
    backgroundColor: "#F7DF1E",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6
  },
  techBadgeJsText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#000000"
  },

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C8C4E6"
  },
  activeDot: {
    width: 18,
    backgroundColor: "#0A6836"
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4
  },
  sectionTitleText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: "#181725"
  },
  viewAllText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: "#0A6836"
  },

  horizontalScrollContent: {
    paddingRight: 10,
    marginBottom: 20
  },

  // 4. Continue Learning Cards
  continueCard: {
    width: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#F0EFFF",
    justifyContent: "space-between",
    ...shadow.soft
  },
  continueTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  continueIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  playCircleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center"
  },
  continueTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#181725",
    marginBottom: 12,
    lineHeight: 17
  },
  progressContainer: {},
  progressTrackBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#EFEFFF",
    overflow: "hidden",
    marginBottom: 6
  },
  progressFillBar: {
    height: "100%",
    backgroundColor: "#0A6836",
    borderRadius: 3
  },
  progressPercentText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: "#7C7C9A"
  },

  // Empty State - Continue Learning
  emptyContinueCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F0EFFF",
    gap: 14,
    ...shadow.soft
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center"
  },
  emptyTextCol: {
    flex: 1
  },
  emptyContinueTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#181725"
  },
  emptyContinueSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#7C7C9A",
    marginTop: 2
  },

  // 5. Popular Courses Cards
  popularCard: {
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 10,
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#F0EFFF",
    ...shadow.soft
  },
  popularImageWrap: {
    position: "relative",
    width: "100%",
    height: 115,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10
  },
  popularImage: {
    width: "100%",
    height: "100%"
  },
  bookmarkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center"
  },
  popularBody: {
    paddingHorizontal: 2
  },
  popularTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#181725",
    marginBottom: 4,
    lineHeight: 17
  },
  popularTags: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#7C7C9A",
    marginBottom: 8
  },
  popularMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12
  },
  metaRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  ratingValText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#181725"
  },
  reviewsText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#7C7C9A"
  },
  metaDot: {
    color: "#7C7C9A",
    fontSize: 10
  },
  lessonsText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#7C7C9A"
  },
  enrollBtn: {
    borderWidth: 1,
    borderColor: "#E5E1FF",
    backgroundColor: "#F8F7FF",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center"
  },
  enrollBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#0A6836"
  },

  // Empty State - Popular Courses
  emptyPopularCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F0EFFF",
    ...shadow.soft
  },
  emptyPopularTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: "#181725",
    marginTop: 8
  },
  emptyPopularSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#7C7C9A",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14
  },
  clearSearchBtn: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E1FF"
  },
  clearSearchText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#0A6836"
  },

  // 6. Top Categories Cards
  categoryCard: {
    width: 108,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginRight: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EFFF",
    ...shadow.soft
  },
  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  categoryName: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#181725",
    textAlign: "center",
    marginBottom: 2
  },
  categoryCount: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "#7C7C9A",
    textAlign: "center"
  },

  // Expert Mentors Carousel
  mentorCard: {
    width: 215,
    borderRadius: 18,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    justifyContent: "space-between",
    ...shadow.soft
  },
  mentorTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  mentorAvatarWrap: {
    position: "relative"
  },
  mentorAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2E7D32",
    borderWidth: 1.5,
    borderColor: "#FFFFFF"
  },
  mentorInfoCol: {
    flex: 1,
    overflow: "hidden"
  },
  mentorCardName: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: "#181725"
  },
  mentorCardRole: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "#7C7C9A",
    marginTop: 2,
    marginBottom: 4
  },
  mentorBadgePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  mentorBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 8
  },
  mentorMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  mentorRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3
  },
  mentorRatingVal: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#181725"
  },
  mentorReviewsVal: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: "#7C7C9A"
  },
  mentorExpText: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: "#7C7C9A"
  },
  viewProfileBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0A6836",
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center"
  },
  viewProfileBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#0A6836"
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },

  // Explore TCM One Styles
  exploreTcmSection: {
    marginVertical: 14,
    paddingHorizontal: 2
  },
  exploreTcmHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: "#181725",
    marginBottom: 12
  },
  exploreTcmGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10
  },
  exploreTcmCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0EFFF",
    ...shadow.soft
  },
  exploreTcmHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  exploreIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  exploreTcmTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#181725",
    marginBottom: 3
  },
  exploreTcmSub: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "#7C7C9A",
    lineHeight: 14
  },

  // Partners Collab Section Styles
  partnersCollabCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18
  },
  collabHeaderInfo: {
    gap: 4
  },
  collabBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4
  },
  collabTitle: {
    fontFamily: fonts.bold,
    fontSize: 14.5
  },
  collabSub: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 16
  },
  collabPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12
  },
  avatarGroupRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  miniAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  miniAvatarText: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
    fontSize: 10
  },
  explorePartnersBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10
  },
  explorePartnersBtnText: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
    fontSize: 11.5
  },

  // Government Preparation Card Styles
  govPrepCardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
    ...shadow.soft
  },
  govCardContent: {},
  govBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  govBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1
  },
  govBadgeLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 0.5
  },
  govCardMainTitle: {
    fontFamily: fonts.bold,
    fontSize: 16.5,
    marginBottom: 4,
    letterSpacing: -0.2
  },
  govCardSubText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14
  },
  govCardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  govStartPracticeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8.5,
    borderRadius: 10
  },
  govStartPracticeText: {
    fontFamily: fonts.bold,
    fontSize: 12
  },
  govTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1
  },
  govTagPillText: {
    fontFamily: fonts.medium,
    fontSize: 11
  }
});
