import { getApiUrlCandidates } from "./api-url-candidates";
import { uriToDataUri } from "../utils/fileUtils";

const REQUEST_TIMEOUT_MS = 6000;
const UPLOAD_TIMEOUT_MS = 300000;

async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  if (typeof AbortController === "undefined") {
    return fetch(url, options);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function request(path, options = {}) {
  const apiUrlCandidates = getApiUrlCandidates();
  let lastNetworkError;
  const triedUrls = [];

  for (const apiUrl of apiUrlCandidates) {
    triedUrls.push(apiUrl);

    try {
      const { headers: optionHeaders = {}, timeoutMs = REQUEST_TIMEOUT_MS, ...requestOptions } = options;
      const response = await fetchWithTimeout(`${apiUrl}${path}`, {
        ...requestOptions,
        headers: {
          "Content-Type": "application/json",
          ...optionHeaders
        }
      }, timeoutMs);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw Object.assign(new Error(data.message || "Request failed"), {
          status: response.status
        });
      }

      return data;
    } catch (error) {
      if (error.status) {
        throw error;
      }

      lastNetworkError = error;
    }
  }

  const triedLabel = triedUrls.join(", ");
  const detail = lastNetworkError?.message ? ` ${lastNetworkError.message}` : "";

  throw new Error(`Unable to connect to backend. Tried: ${triedLabel}.${detail}`);
}

export async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function register(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteAccount(token) {
  return request("/auth/delete-account", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function getHome(token) {
  let homeData = null;
  try {
    homeData = await request("/home", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch (err) {
    if (err.status === 401) throw err;
  }

  // Fetch live jobs endpoint /jobs
  let apiJobs = [];
  try {
    const jobsRes = await request("/jobs?filter=all", {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (jobsRes && Array.isArray(jobsRes.jobs)) {
      apiJobs = jobsRes.jobs;
    }
  } catch (e) {}

  // Combine apiJobs and localJobPosts (deduplicated by ID)
  const combinedJobMap = new Map();
  (apiJobs || []).forEach((j) => {
    const jId = String(j.id || j._id);
    combinedJobMap.set(jId, j);
  });
  // Assuming localJobPosts variable exists as per context
  (typeof localJobPosts !== 'undefined' ? localJobPosts : []).forEach((j) => {
    const jId = String(j.id || j._id);
    if (!combinedJobMap.has(jId)) {
      combinedJobMap.set(jId, j);
    }
  });

  const allJobs = Array.from(combinedJobMap.values());

  const jobPostCards = allJobs.map((j) => {
    const selectedCount = (j.applicants || []).filter((a) => a.status === "selected").length;
    const reqLimit = Number(j.requiredCandidates || 1);
    const isFilled = j.status === "filled" || selectedCount >= reqLimit;

    const formattedJob = {
      ...j,
      id: String(j.id || j._id),
      selectedCandidates: selectedCount,
      status: isFilled ? "filled" : "active"
    };

    return {
      id: String(j.id || j._id),
      authorName: j.mentorName || "TCM One Mentor",
      authorAvatarUrl: j.mentorAvatarUrl || j.authorAvatarUrl || "",
      authorRole: j.mentorRole || "Senior Mentor",
      publishedAt: j.createdAt || new Date().toISOString(),
      isMentor: true,
      isPinned: false,
      postType: "job_news",
      category: "💼 Jobs & Hiring",
      text: `HIRING DRIVE: ${j.title} at ${j.company || "TCM One Partner"}. Salary: ₹${j.minSalary} - ₹${j.maxSalary} ${j.salaryPeriod || "LPA"}. Deadline: ${j.deadline || "Open"}.\n\n${j.description}`,
      timeLabel: "Active Hiring",
      documentUrl: j.documentUrl,
      documentName: j.documentName,
      documentSize: j.documentSize,
      media: j.imageUrl ? { kind: "photo", imageUrl: j.imageUrl } : { kind: "none" },
      jobData: formattedJob,
      likedBy: j.likedBy || [],
      likesCount: j.likesCount !== undefined ? j.likesCount : (j.likes || 12),
      commentsCount: (j.applicants || []).length,
      comments: []
    };
  });

  if (homeData) {
    const existingCategories = Array.isArray(homeData.categories) ? [...homeData.categories] : [];
    if (!existingCategories.some((c) => String(c).includes("Jobs"))) {
      existingCategories.splice(3, 0, "💼 Jobs & Hiring");
    }

    const existingPosts = Array.isArray(homeData.posts) ? homeData.posts : [];
    const nonJobPosts = existingPosts.filter(
      (p) => p.postType !== "job_news" && !p.jobData && !jobPostCards.some((j) => j.id === p.id || j.id === String(p.id).replace(/^post-/, ""))
    );

    const parsePostTime = (p) => {
      if (!p) return 0;
      const raw = p.publishedAt || p.createdAt;
      if (raw) {
        const t = new Date(raw).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      const idStr = String(p.id || p._id || "");
      if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
        const mongoTime = parseInt(idStr.substring(0, 8), 16) * 1000;
        if (!isNaN(mongoTime) && mongoTime > 1000000000000) return mongoTime;
      }
      return Date.now();
    };

    const mergedPosts = [...nonJobPosts, ...jobPostCards].sort((a, b) => parsePostTime(b) - parsePostTime(a));

    return {
      ...homeData,
      categories: existingCategories,
      posts: mergedPosts
    };
  }

  return {
    user: {
      id: "local-user",
      name: "TCM One Learner",
      email: "user@tcm.com",
      role: "student",
      avatarUrl: "",
      progress: 0,
      wallet: { balance: 0, coins: 100, transactions: [] }
    },
    notifications: 0,
    progress: { label: "Today's Progress", value: 0 },
    tabs: [
      { key: "Home", icon: "home" },
      { key: "Learn", icon: "book-open" },
      { key: "Community", icon: "users" },
      { key: "Chats", icon: "message-square" },
      { key: "Profile", icon: "user" }
    ],
    categories: ["For You", "Following", "Trending", "💼 Jobs & Hiring", "UPSC", "JEE", "NEET", "Coding", "AI / ML", "Design"],
    learn: {
      heroBanners: [],
      continueLearning: [],
      popularCourses: [],
      topCategories: []
    },
    stories: [],
    posts: jobPostCards
  };
}

export function createCommunityPost(token, payload) {
  return request("/home/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function uploadFile(token, dataUri, timeoutMs = UPLOAD_TIMEOUT_MS) {
  return request("/uploads/file", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ data: dataUri }),
    timeoutMs
  });
}

export async function uploadImageToServer(token, uri, mimeType = "image/jpeg") {
  if (!uri) return "";
  const trimmed = String(uri).trim();
  if (/^(https?:\/\/|\/uploads\/)/i.test(trimmed)) return trimmed;
  const dataUri = /^data:/i.test(trimmed) ? trimmed : await uriToDataUri(trimmed, mimeType);
  if (!dataUri) return "";
  const res = await uploadFile(token, dataUri);
  return res?.url || "";
}

export function deleteCommunityPost(token, postId) {
  return request(`/home/posts/${postId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function toggleSavePost(token, postId) {
  return request(`/home/post/${postId}/save`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getSavedPosts(token) {
  return request(`/home/saved-posts`, {
    headers: { Authorization: token ? `Bearer ${token}` : "" }
  });
}

export function toggleCommentLike(token, postId, commentId) {
  return request(`/home/post/${postId}/comment/${commentId}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getCommunities(token) {
  return request("/home/communities", {
    headers: {
      Authorization: token ? `Bearer ${token}` : ""
    }
  });
}

export function createCommunityChannel(token, payload) {
  return request("/home/communities", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function deleteCommunityChannel(token, communityId) {
  return request(`/home/communities/${communityId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function joinCommunityChannel(token, communityId) {
  return request(`/home/communities/${communityId}/join`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createCourse(token, payload) {
  return request("/home/courses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function getProfile(token) {
  return request("/profile", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function updateProfile(token, payload) {
  try {
    return await request("/profile", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (error.status === 404) {
      return await request("/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    }
    throw error;
  }
}

export function toggleFollowUser(token, payload) {
  return request("/profile/follow", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function getTargetUserProfile(token, targetUserId) {
  return request(`/profile/user/${encodeURIComponent(targetUserId)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function sendFriendRequestAction(token, targetUserId, action = "send") {
  return request("/profile/friend-request", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ targetUserId, action })
  });
}

export function sendFriendRequest(token, targetUserId, action = "send") {
  return request(`/home/user/${encodeURIComponent(targetUserId)}/friend-request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action })
  });
}

export function getCourseDetails(token, courseId) {
  return request(`/home/course/${encodeURIComponent(courseId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

export function getContinueLearningDetails(token) {
  return request("/home/continue-learning", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getPopularCoursesDetails(token) {
  return request("/home/popular-courses", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getMentorCourses(token) {
  return request("/home/mentor/courses", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function searchGlobal(token, query) {
  return request(`/home/search?q=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getMentorDetails(token, mentorId) {
  return request(`/home/mentor/${encodeURIComponent(mentorId || "m1")}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getChatMessages(token, targetUserId) {
  return request(`/chat/messages/${encodeURIComponent(targetUserId || "m1")}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function sendChatMessage(token, { targetUserId, text, mediaType, mediaUrl, driveLink, fileName }) {
  return request("/chat/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ targetUserId, text, mediaType, mediaUrl, driveLink, fileName })
  });
}

export function deleteChatMessage(token, messageId) {
  return request(`/chat/messages/${messageId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getNotifications(token) {
  return request("/home/notifications", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function markAllNotificationsReadApi(token) {
  return request("/home/notifications/read-all", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function submitClassReflection(token, reflectionData) {
  return request("/home/class-reflection", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(reflectionData)
  });
}

export function getWallet(token) {
  return request("/home/wallet", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function withdrawWalletFunds(token, data) {
  return request("/home/wallet/withdraw", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
}

export function addWalletMoney(token, data) {
  return request("/home/wallet/add-money", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
}

export function getCategoryCourses(token, categoryKey) {
  return request(`/home/category-courses/${categoryKey}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

export function getAllMentors(token) {
  return request("/home/all-mentors", {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

export function updateCourse(token, courseId, courseData) {
  return request(`/home/courses/${courseId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(courseData)
  });
}

export function deleteCourse(token, courseId) {
  return request(`/home/courses/${courseId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createWebinar(token, webinarData) {
  return request("/home/webinars", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(webinarData)
  });
}

export function getWebinars(token) {
  return request("/home/webinars", {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

export function getPostById(postId) {
  return request(`/home/post/${postId}`);
}

export function togglePostLike(token, postId) {
  return request(`/home/post/${postId}/like`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function repostPost(token, postId) {
  return request(`/home/post/${postId}/repost`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function addPostComment(token, postId, text, parentCommentId) {
  return request(`/home/post/${postId}/comment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ text, parentCommentId })
  });
}

export function getPostComments(token, postId) {
  return request(`/home/post/${postId}/comments`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

export function deletePostComment(token, postId, commentId) {
  return request(`/home/post/${postId}/comment/${commentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function sharePost(token, postId) {
  return request(`/home/post/${postId}/share`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

export function respondToFriendRequestNotification(token, notificationId, action) {
  return request(`/home/notifications/${notificationId}/action`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action })
  });
}

export function getChatConversations(token) {
  return request("/chat/conversations", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getDoubtsList(token) {
  return request("/home/doubts", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createDoubtThread(token, data) {
  return request("/home/doubts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export function getDoubtRooms(token) {
  return request("/home/doubt-rooms", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createDoubtRoom(token, data) {
  return request("/home/doubt-rooms", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export function getDoubtRoomDetails(token, roomId) {
  return request(`/home/doubt-rooms/${roomId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function sendDoubtRoomMessage(token, roomId, data) {
  return request(`/home/doubt-rooms/${roomId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export function askAiDoubt(token, roomId, data) {
  return request(`/home/doubt-rooms/${roomId}/ask-ai`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export function askSupportAi(token, query) {
  return request("/home/support/ask-ai", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ query })
  });
}

export function createDoubtRoomPoll(token, roomId, data) {
  return request(`/home/doubt-rooms/${roomId}/polls`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export function voteDoubtRoomPoll(token, roomId, pollId, optionId) {
  return request(`/home/doubt-rooms/${roomId}/polls/${pollId}/vote`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ optionId })
  });
}

export function markDoubtRoomSolved(token, roomId, data) {
  return request(`/home/doubt-rooms/${roomId}/mark-solved`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data || {})
  });
}

export function searchKnowledgeBase(token, query) {
  return request(`/home/knowledge-base/search?q=${encodeURIComponent(query || "")}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function scheduleLiveClassLink(token, courseId, data) {
  return request(`/home/courses/${encodeURIComponent(courseId)}/schedule-live`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export function joinDoubtRoom(token, roomId) {
  return request(`/home/doubt-rooms/${roomId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function manageDoubtRoom(token, roomId, data) {
  return request(`/home/doubt-rooms/${roomId}/manage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export function updateCommunityChannel(token, commId, data) {
  return request(`/home/communities/${encodeURIComponent(commId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export function submitCommunityJoinRequest(token, commId) {
  return request(`/home/communities/${encodeURIComponent(commId)}/request-access`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function manageCommunityJoinRequest(token, commId, targetUserId, action) {
  return request(`/home/communities/${encodeURIComponent(commId)}/manage-request`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetUserId, action })
  });
}

export function registerPushTokenApi(token, pushToken, platform) {
  return request(`/home/notifications/register-token`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pushToken, platform })
  });
}

export async function googleLogin(email, name, avatarUrl, idToken, role = "student", referralCode = "") {
  return request("/auth/google", {
    method: "POST",
    body: JSON.stringify({ email, name, avatarUrl, idToken, role, referralCode })
  });
}

export function sendForgotPasswordOtp(email) {
  return request("/auth/forgot-password/send-otp", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function verifyForgotPasswordOtp(email, otp) {
  return request("/auth/forgot-password/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp })
  });
}

export function resetPasswordWithOtp(email, otp, newPassword) {
  return request("/auth/forgot-password/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword })
  });
}

export function convertCoinsToCash(token, coins = 100) {
  return request("/home/wallet/convert-coins", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ coins })
  });
}

export function convertReferralBonus(token, referralId, friendName) {
  return request("/home/wallet/convert-referral", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ referralId, friendName })
  });
}

export function submitMentorStudentReview(token, payload) {
  return request("/profile/class-reviews/mentor-review", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function getMentorClassReviews(token) {
  return request("/profile/class-reviews/mentor", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getUserClassReviews(userId, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request(`/profile/class-reviews/user/${userId}`, { headers });
}

export function getEnrolledStudents(token) {
  return request("/profile/enrolled-students", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function applyReferralCode(token, referralCode) {
  return request("/profile/apply-referral", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ referralCode })
  });
}

// ==========================================
// MENTOR JOB POSTING & AI CANDIDATE TRACKER
// ==========================================

let localJobPosts = [];

export async function getJobPosts(token, filter = "all") {
  try {
    const res = await request(`/jobs?filter=${filter}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res && Array.isArray(res.jobs)) {
      return res.jobs;
    }
  } catch (e) {
    // Fallback to local job store
  }

  // AI Evaluation: Auto-expire or mark as filled ONLY if selected candidates limit reached
  const updatedJobs = localJobPosts.map((j) => {
    const applicants = j.applicants || [];
    const selectedCount = applicants.filter((a) => a.status === "selected").length;
    const reqLimit = Number(j.requiredCandidates || 1);
    const isFilled = selectedCount >= reqLimit;
    return {
      ...j,
      selectedCandidates: selectedCount,
      status: isFilled ? "filled" : "active"
    };
  });
  localJobPosts = updatedJobs;

  if (filter === "active") {
    return updatedJobs.filter((j) => j.status === "active");
  }
  return updatedJobs;
}

export async function createJobPost(token, payload) {
  try {
    const res = await request("/jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (res && res.job) {
      localJobPosts.unshift(res.job);
      return res.job;
    }
  } catch (e) {
    // Fallback to local store insertion
  }

  const newJob = {
    id: `job-${Date.now()}`,
    title: payload.title || "Software Engineering Role",
    company: payload.company || "TCM One Hiring Partner",
    mentorName: payload.mentorName || "Mentor",
    mentorAvatarUrl: payload.mentorAvatarUrl || "",
    mentorRole: payload.mentorRole || "Tech Mentor",
    description: payload.description || "",
    minSalary: payload.minSalary || "3,00,000",
    maxSalary: payload.maxSalary || "6,00,000",
    salaryPeriod: payload.salaryPeriod || "LPA",
    requiredCandidates: Number(payload.requiredCandidates) || 5,
    appliedCandidates: 0,
    selectedCandidates: 0,
    applicants: [],
    startDate: payload.startDate || "Immediate",
    deadline: payload.deadline || "Open until filled",
    imageUrl: payload.imageUrl || "",
    documentUrl: payload.documentUrl || "",
    documentName: payload.documentName || (payload.documentUrl ? "Job_Description.pdf" : ""),
    documentSize: payload.documentSize || "1.5 MB",
    createdAt: new Date().toISOString(),
    status: "active"
  };

  localJobPosts.unshift(newJob);
  return newJob;
}

export async function updateJobPost(token, jobId, payload) {
  const cleanId = String(jobId).replace(/^post-/, "");
  try {
    const res = await request(`/jobs/${cleanId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (res && res.job) {
      const idx = localJobPosts.findIndex((j) => j.id === cleanId);
      if (idx !== -1) localJobPosts[idx] = res.job;
      return res.job;
    }
  } catch (e) {}

  const idx = localJobPosts.findIndex((j) => j.id === cleanId || j.id === jobId);
  if (idx === -1) throw new Error("Job posting not found.");

  const currentJob = localJobPosts[idx];
  const reqLimit = Number(payload.requiredCandidates !== undefined ? payload.requiredCandidates : currentJob.requiredCandidates || 1);
  const selectedCount = (currentJob.applicants || []).filter((a) => a.status === "selected").length;
  const isFilled = selectedCount >= reqLimit;

  const updatedJob = {
    ...currentJob,
    title: payload.title !== undefined ? payload.title : currentJob.title,
    company: payload.company !== undefined ? payload.company : currentJob.company,
    description: payload.description !== undefined ? payload.description : currentJob.description,
    minSalary: payload.minSalary !== undefined ? payload.minSalary : currentJob.minSalary,
    maxSalary: payload.maxSalary !== undefined ? payload.maxSalary : currentJob.maxSalary,
    salaryPeriod: payload.salaryPeriod !== undefined ? payload.salaryPeriod : currentJob.salaryPeriod,
    requiredCandidates: reqLimit,
    selectedCandidates: selectedCount,
    startDate: payload.startDate !== undefined ? payload.startDate : currentJob.startDate,
    deadline: payload.deadline !== undefined ? payload.deadline : currentJob.deadline,
    imageUrl: payload.imageUrl !== undefined ? payload.imageUrl : currentJob.imageUrl,
    documentUrl: payload.documentUrl !== undefined ? payload.documentUrl : currentJob.documentUrl,
    documentName: payload.documentName !== undefined ? payload.documentName : currentJob.documentName,
    status: isFilled ? "filled" : "active"
  };

  localJobPosts[idx] = updatedJob;
  return updatedJob;
}

export async function applyJobPost(token, jobId, applicationData = {}) {
  const cleanId = String(jobId).replace(/^post-/, "");
  try {
    const res = await request(`/jobs/${cleanId}/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(applicationData)
    });
    if (res && res.job) {
      return res.job;
    }
  } catch (e) {
    // Fallback
  }

  const jobIndex = localJobPosts.findIndex((j) => j.id === cleanId || j.id === jobId);
  if (jobIndex === -1) throw new Error("Job posting not found.");

  const job = localJobPosts[jobIndex];
  const applicants = job.applicants || [];
  const uId = String(applicationData.userId || applicationData.id || "guest-user");

  if (applicants.some((a) => String(a.userId) === uId)) {
    throw new Error("You have already applied for this job!");
  }

  const applicantRecord = {
    userId: uId,
    name: applicationData.name || "Student Candidate",
    email: applicationData.email || "student@tcm.edu",
    phone: applicationData.phone || "+91 9876543210",
    portfolioUrl: applicationData.portfolioUrl || "",
    resumeUrl: applicationData.resumeUrl || "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
    resumeName: applicationData.resumeName || "Resume_Student.pdf",
    resumeSize: applicationData.resumeSize || "1.2 MB",
    coverNote: applicationData.coverNote || "",
    status: "pending",
    appliedAt: new Date().toISOString().slice(0, 10)
  };

  const newAppliedCount = (job.appliedCandidates || 0) + 1;
  const selectedCount = (job.applicants || []).filter((a) => a.status === "selected").length;
  const reqLimit = Number(job.requiredCandidates || 1);
  const isFilled = selectedCount >= reqLimit;

  const updatedJob = {
    ...job,
    appliedCandidates: newAppliedCount,
    selectedCandidates: selectedCount,
    applicants: [applicantRecord, ...applicants],
    status: isFilled ? "filled" : "active"
  };

  localJobPosts[jobIndex] = updatedJob;
  return updatedJob;
}

export async function updateJobApplicantStatus(token, jobId, applicantUserId, status) {
  const cleanId = String(jobId).replace(/^post-/, "");
  try {
    const res = await request(`/jobs/${cleanId}/applicants/${applicantUserId}/status`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    if (res && res.job) {
      const idx = localJobPosts.findIndex((j) => j.id === cleanId);
      if (idx !== -1) localJobPosts[idx] = res.job;
      return res.job;
    }
  } catch (e) {}

  const idx = localJobPosts.findIndex((j) => j.id === cleanId || j.id === jobId);
  if (idx === -1) throw new Error("Job posting not found.");

  const job = localJobPosts[idx];
  const applicants = (job.applicants || []).map((app) => {
    if (String(app.userId) === String(applicantUserId)) {
      return { ...app, status };
    }
    return app;
  });

  const selectedCount = applicants.filter((a) => a.status === "selected").length;
  const reqLimit = Number(job.requiredCandidates || 1);
  const isFilled = selectedCount >= reqLimit;

  const updatedJob = {
    ...job,
    applicants,
    selectedCandidates: selectedCount,
    status: isFilled ? "filled" : "active"
  };

  localJobPosts[idx] = updatedJob;
  return updatedJob;
}

export async function getJobApplicants(token, jobId) {
  const cleanId = String(jobId).replace(/^post-/, "");
  try {
    const res = await request(`/jobs/${cleanId}/applicants`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res && Array.isArray(res.applicants)) {
      return res.applicants;
    }
  } catch (e) {}

  const job = localJobPosts.find((j) => j.id === cleanId || j.id === jobId);
  return job?.applicants || [];
}

export async function deleteJobPost(token, jobId) {
  const cleanId = String(jobId).replace(/^post-/, "");
  try {
    await request(`/jobs/${cleanId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {}

  localJobPosts = localJobPosts.filter((j) => j.id !== cleanId && j.id !== jobId);
  return { success: true, remainingJobs: localJobPosts };
}

export async function getMentorJobPosts(token, user = {}) {
  const allJobs = await getJobPosts(token, "all");
  if (!user || (!user.name && !user.id)) return allJobs;

  const currentName = String(user.name || "").toLowerCase().trim();
  const currentId = String(user.id || user._id || "").toLowerCase().trim();

  return allJobs.filter((j) => {
    const mentorName = String(j.mentorName || "").toLowerCase().trim();
    const mentorId = String(j.mentorId || "").toLowerCase().trim();

    return (
      (currentName && (mentorName.includes(currentName) || currentName.includes(mentorName))) ||
      (currentId && mentorId === currentId) ||
      j.isCreatedByMe
    );
  });
}

export async function getPublicPartners() {
  try {
    const res = await request("/partners");
    if (res?.partners) return res.partners;
  } catch (e) {}
  return [];
}

export function allocateCourseToStudent(token, data) {
  return request("/admin/allocate-course", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export function updateCourseSchedule(token, courseId, data) {
  return request(`/admin/courses/${courseId}/schedule`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function saveExamResult(token, resultData) {
  try {
    return await request("/profile/exam-results", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(resultData)
    });
  } catch (err) {
    return { success: true, result: resultData };
  }
}

export async function getExamResults(token) {
  try {
    return await request("/profile/exam-results", {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    return { success: true, results: [] };
  }
}

// GOVERNMENT PREPARATION MODULE API METHODS
export function getGovCategories() {
  return request("/government/categories");
}

export function getGovExams(category = "") {
  const q = category ? `?category=${encodeURIComponent(category)}` : "";
  return request(`/government/exams${q}`);
}

export function getGovYears(examId) {
  return request(`/government/exams/${examId}/years`);
}

export function getGovSubjects(examId) {
  return request(`/government/exams/${examId}/subjects`);
}

export function getGovTopics(subjectId) {
  return request(`/government/subjects/${subjectId}/topics`);
}

export function getGovQuestionCount(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/government/questions/count?${query}`);
}

export function getGovQuestions(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/government/questions?${query}`);
}

export function getGovRandomQuestions(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/government/questions/random?${query}`);
}

export function attemptGovQuestion(token, questionId, payload) {
  return request(`/government/questions/${questionId}/attempt`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function saveGovQuestion(token, questionId) {
  return request(`/government/questions/${questionId}/save`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getSavedGovQuestions(token) {
  return request("/government/saved", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getGovProgress(token) {
  return request("/government/progress", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function explainGovQuestionWithAI(token, questionId, payload = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return request(`/government/questions/${encodeURIComponent(questionId)}/explain-ai`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

// SECTION 10: GOVERNMENT LEARNING API CLIENT METHODS
export function getGovernmentStates() {
  return request("/government/states");
}

export function getGovernmentExams(stateId = "") {
  const q = stateId ? `?state=${encodeURIComponent(stateId)}` : "";
  return request(`/government/exams${q}`);
}

export function getGovernmentSubjects(examId = "") {
  const q = examId ? `?examId=${encodeURIComponent(examId)}` : "";
  return request(`/government/exams/${examId || "all"}/subjects${q}`);
}

export function getGovernmentTopics(subjectId = "") {
  const q = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : "";
  return request(`/government/subjects/${subjectId || "all"}/topics${q}`);
}

export function getGovernmentChapters(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  return request(`/government/chapters?${query}`);
}

export function getGovernmentChapter(chapterId) {
  return request(`/government/chapters/${encodeURIComponent(chapterId)}`);
}

export function getGovernmentLearningProgress(token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return request("/government/progress", { headers });
}

export function saveChapterProgress(token, chapterId, progress = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return request(`/government/chapters/${encodeURIComponent(chapterId)}/progress`, {
    method: "POST",
    headers,
    body: JSON.stringify(progress)
  });
}

export function bookmarkChapter(token, chapterId) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return request(`/government/chapters/${encodeURIComponent(chapterId)}/bookmark`, {
    method: "POST",
    headers
  });
}

export function explainChapterWithAI(token, chapterId, language = "en") {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return request(`/government/questions/${encodeURIComponent(chapterId)}/explain-ai`, {
    method: "POST",
    headers,
    body: JSON.stringify({ language })
  });
}

export function saveChapterNote(token, chapterId, notePayload = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return request(`/government/chapters/${encodeURIComponent(chapterId)}/notes`, {
    method: "POST",
    headers,
    body: JSON.stringify(notePayload)
  });
}

export function getChapterNotes(token, chapterId) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return request(`/government/chapters/${encodeURIComponent(chapterId)}/notes`, { headers });
}

export function getGovernmentSources() {
  return request("/government/sources");
}

export function syncGovernmentSource(token, sourceId) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return request("/government/sources/sync", {
    method: "POST",
    headers,
    body: JSON.stringify({ sourceId })
  });
}

export function getGovernmentMockTests(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  return request(`/government/mock-tests?${query}`);
}

export function getGovernmentMockTestDetails(testId) {
  return request(`/government/mock-tests/${encodeURIComponent(testId)}`);
}

export function submitGovernmentMockTest(testId, payload) {
  return request(`/government/mock-tests/${encodeURIComponent(testId)}/submit`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}



