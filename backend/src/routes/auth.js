import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Mentor } from "../models/Mentor.js";
import { sendOtpEmail } from "../services/emailService.js";
import { requireAuth } from "../middleware/auth.js";
import { selfSignupRole, verifyGoogleIdToken } from "../services/googleIdentity.js";

export const authRouter = express.Router();

const TOKEN_ISSUER = "tcm";
const TOKEN_AUDIENCE = "tcm-app";

function signToken(user) {
  const secret = process.env.JWT_SECRET || "tcm_local_dev_secret_change_before_production";
  return jwt.sign(
    {
      sub: String(user._id || user.id),
      role: user.role,
      name: user.name,
      email: user.email
    },
    secret,
    {
      expiresIn: "30d",
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE
    }
  );
}

export function publicUser(user) {
  let userHandle = user.handle;
  if (!userHandle || !userHandle.trim()) {
    if (user.name) {
      userHandle = user.name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    } else if (user.email) {
      userHandle = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "_");
    } else {
      userHandle = "member";
    }
  }
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isApproved: user.isApproved !== undefined ? user.isApproved : (user.role === "mentor" ? false : true),
    avatarUrl: user.avatarUrl || "",
    handle: userHandle,
    verified: user.verified !== undefined ? user.verified : false,
    memberBadge: user.memberBadge || (user.role === "partner" ? "TCM Partner Institute" : user.role === "mentor" ? "TCM Mentor" : "TCM Member"),
    mentorCategory: user.mentorCategory || "TCM Information Tech",
    instituteName: user.instituteName || user.name || "TCM Partner Institute",
    partnerCategory: user.partnerCategory || "TCM Partner Institute",
    contactNumber: user.contactNumber || "",
    totalRevenue: user.totalRevenue !== undefined && user.totalRevenue !== null ? user.totalRevenue : "₹0",
    monthlyRevenue: user.monthlyRevenue !== undefined && user.monthlyRevenue !== null ? user.monthlyRevenue : "₹0",
    totalStudentsCount: user.totalStudentsCount !== undefined && user.totalStudentsCount !== null ? Number(user.totalStudentsCount) : 0,
    activeMentorsCount: user.activeMentorsCount !== undefined && user.activeMentorsCount !== null ? Number(user.activeMentorsCount) : 0,
    rating: user.rating !== undefined && user.rating !== null ? Number(user.rating) : 5.0,
    reviewsCount: user.reviewsCount !== undefined && user.reviewsCount !== null ? String(user.reviewsCount) : "0 Reviews",
    existingCourses: user.existingCourses || ["Full Stack Development", "Python Programming", "Web Development"],
    galleryPhotos: user.galleryPhotos || [],
    recentStudents: user.recentStudents || [],
    yearsExperience: user.yearsExperience || "5+ Yrs Exp",
    subjects: user.subjects || [],
    experiences: user.experiences || [],
    certifications: user.certifications || [],
    interests: user.interests || [],
    skills: user.skills || [],
    bio: user.bio || "",
    location: user.location || "Bilaspur, Chhattisgarh",
    city: user.city || (user.location || "Bilaspur").split(",")[0].trim(),
    gmbLink: user.gmbLink || "",
    heroCover: user.heroCover || "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800",
    labFee: user.labFee || "Free",
    timings: user.timings || "9:00 AM - 6:00 PM",
    joinedDate: user.joinedDate || `Joined ${new Date(user.createdAt || Date.now()).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
    website: user.website || "",
    stats: user.stats || {
      postsCount: 0,
      followers: "0",
      following: 0,
      reputation: "0"
    },
    quickTools: user.quickTools || {
      savedCount: 0,
      draftsCount: 0,
      downloadsCount: 0,
      notesCount: 0
    },
    progress: user.progress || 0,
    tcmCoins: user.tcmCoins !== undefined ? user.tcmCoins : 0,
    referralCode: getOrGenerateReferralCode(user),
    referredBy: user.referredBy || "",
    referralAppliedAt: user.referralAppliedAt || null,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : user.createdAtIso || new Date().toISOString()
  };
}

export function getOrGenerateReferralCode(user) {
  if (!user) return "TCM25X";
  if (user.referralCode) return String(user.referralCode).toUpperCase();
  const rawName = (user.name || user.email || "TCM").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const prefix = rawName.substring(0, 3).padEnd(3, "X");
  return `${prefix}25X`.substring(0, 6);
}

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function getMemoryUsers(memoryStore) {
  if (!memoryStore.users) {
    memoryStore.users = [memoryStore.user].filter(Boolean);
  }

  return memoryStore.users;
}

authRouter.post("/register", async (req, res) => {
  try {
    const memoryStore = req.app.locals.memoryStore;
    const { name, email, password, mentorCategory = "TCM Information Tech", referralCode } = req.body;
    const role = selfSignupRole(req.body.role);

    if (!role) return res.status(400).json({ code: "INVALID_SIGNUP_ROLE", message: "Choose a learner or mentor account" });
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const cleanRefCode = referralCode ? String(referralCode).trim().toUpperCase() : "";
    const nowIso = new Date().toISOString();
    const isMentorRole = role === "mentor";
    const isApproved = !isMentorRole; // Mentors default to pending approval (false)

    if (memoryStore) {
      const users = getMemoryUsers(memoryStore);

      if (users.some((user) => user.email === normalizedEmail)) {
        return res.status(409).json({ message: "Email is already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = {
        _id: `user-${Date.now()}`,
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        isApproved,
        mentorCategory,
        avatarUrl: "",
        progress: 0,
        referredBy: cleanRefCode,
        referralAppliedAt: cleanRefCode ? new Date() : null,
        createdAt: nowIso,
        createdAtIso: nowIso
      };

      users.push(user);

      if (isMentorRole) {
        if (!Array.isArray(memoryStore.mentors)) {
          memoryStore.mentors = [];
        }
        memoryStore.mentors.unshift({
          _id: user._id,
          id: user._id,
          userId: user._id,
          name: user.name,
          email: user.email,
          title: `${user.mentorCategory} Mentor`,
          mentorCategory: user.mentorCategory,
          isApproved: false,
          rating: 5.0,
          learners: "0",
          avatarUrl: user.avatarUrl,
          skills: ["Mentorship", user.mentorCategory]
        });
      }

      return res.status(201).json({
        token: signToken(user),
        user: publicUser(user),
        message: isMentorRole ? "Mentor account registered! Pending admin approval before public listing." : "Account created successfully."
      });
    }

    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role,
      isApproved,
      mentorCategory,
      referredBy: cleanRefCode,
      referralAppliedAt: cleanRefCode ? new Date() : null
    });

    if (cleanRefCode) {
      try {
        const referrerUser = await User.findOne({
          $or: [
            { referralCode: cleanRefCode },
            { handle: cleanRefCode.toLowerCase() },
            { name: new RegExp(`^${cleanRefCode.substring(0, 4)}`, "i") }
          ]
        });
        if (referrerUser && String(referrerUser._id) !== String(user._id)) {
          referrerUser.tcmCoins = (referrerUser.tcmCoins || 0) + 50;
          referrerUser.walletBalance = (referrerUser.walletBalance || 0) + 100;
          await referrerUser.save();
        }
        user.tcmCoins = (user.tcmCoins || 0) + 25;
        user.walletBalance = (user.walletBalance || 0) + 50;
        await user.save();
      } catch (refErr) {
        console.warn("Could not credit signup referral reward:", refErr);
      }
    }

    if (isMentorRole) {
      try {
        await Mentor.create({
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          title: `${user.mentorCategory} Mentor`,
          mentorCategory: user.mentorCategory,
          isApproved: false,
          rating: 5.0,
          learners: "0",
          skills: ["Mentorship", user.mentorCategory]
        });
      } catch (mErr) {
        console.warn("Could not auto-create Mentor document:", mErr);
      }
    }

    res.status(201).json({
      token: signToken(user),
      user: publicUser(user),
      message: isMentorRole ? "Mentor account registered! Pending admin approval before public listing." : "Account created successfully."
    });
  } catch (error) {
    res.status(500).json({ message: "Could not create account" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const memoryStore = req.app.locals.memoryStore;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);

    if (memoryStore) {
      const users = getMemoryUsers(memoryStore);
      const user = users.find((item) => item.email === normalizedEmail);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatches) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      return res.json({
        token: signToken(user),
        user: publicUser(user)
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Could not log in" });
  }
});

// Google Authentication Route
authRouter.post("/google", async (req, res) => {
  try {
    const memoryStore = req.app.locals.memoryStore;
    const { idToken, referralCode } = req.body;
    const requestedRole = selfSignupRole(req.body.role);
    if (!requestedRole) return res.status(400).json({ code: "INVALID_SIGNUP_ROLE", message: "Choose a learner or mentor account" });
    const identity = await verifyGoogleIdToken(idToken);
    if (!identity) return res.status(401).json({ code: "GOOGLE_IDENTITY_INVALID", message: "Google sign-in could not be verified" });

    const normalizedEmail = identity.email;
    const googleName = identity.name || normalizedEmail.split("@")[0];
    const googleAvatar = identity.picture;
    const defaultHandle = googleName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    const cleanRefCode = referralCode ? String(referralCode).trim().toUpperCase() : "";
    const nowIso = new Date().toISOString();

    if (memoryStore) {
      const users = getMemoryUsers(memoryStore);
      let user = users.find((u) => u.email === normalizedEmail);

      if (!user) {
        user = {
          _id: `google-user-${Date.now()}`,
          name: googleName,
          email: normalizedEmail,
          handle: defaultHandle,
          passwordHash: await bcrypt.hash(`google_${Date.now()}`, 10),
          role: requestedRole,
          isApproved: requestedRole !== "mentor",
          avatarUrl: googleAvatar,
          verified: true,
          googleSubject: identity.subject,
          progress: 0,
          referredBy: cleanRefCode,
          referralAppliedAt: cleanRefCode ? new Date() : null,
          createdAt: nowIso,
          createdAtIso: nowIso
        };
        users.push(user);
      } else {
        if (user.googleSubject && user.googleSubject !== identity.subject) {
          return res.status(401).json({ code: "GOOGLE_IDENTITY_INVALID", message: "Google sign-in could not be verified" });
        }
        // PRESERVE user custom name, handle, and avatarUrl if updated by user!
        if (!user.name) user.name = googleName;
        if (!user.handle) user.handle = defaultHandle;
        if (!user.avatarUrl) user.avatarUrl = googleAvatar;
        user.verified = true;
        user.googleSubject = identity.subject;
        if (!user.referredBy && cleanRefCode) {
          user.referredBy = cleanRefCode;
          user.referralAppliedAt = new Date();
        }
      }

      return res.json({
        token: signToken(user),
        user: publicUser(user)
      });
    }

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const passwordHash = await bcrypt.hash(`google_${Date.now()}`, 10);
      user = await User.create({
        name: googleName,
        email: normalizedEmail,
        handle: defaultHandle,
        passwordHash,
        role: requestedRole,
        isApproved: requestedRole !== "mentor",
        avatarUrl: googleAvatar,
        verified: true,
        googleSubject: identity.subject,
        referredBy: cleanRefCode,
        referralAppliedAt: cleanRefCode ? new Date() : null
      });

      if (cleanRefCode) {
        try {
          const referrerUser = await User.findOne({
            $or: [
              { referralCode: cleanRefCode },
              { handle: cleanRefCode.toLowerCase() },
              { name: new RegExp(`^${cleanRefCode.substring(0, 4)}`, "i") }
            ]
          });
          if (referrerUser && String(referrerUser._id) !== String(user._id)) {
            referrerUser.tcmCoins = (referrerUser.tcmCoins || 0) + 50;
            referrerUser.walletBalance = (referrerUser.walletBalance || 0) + 100;
            await referrerUser.save();
          }
          user.tcmCoins = (user.tcmCoins || 0) + 25;
          user.walletBalance = (user.walletBalance || 0) + 50;
          await user.save();
        } catch (refErr) {
          console.warn("Could not credit Google signup referral reward:", refErr);
        }
      }
    } else {
      if (user.googleSubject && user.googleSubject !== identity.subject) {
        return res.status(401).json({ code: "GOOGLE_IDENTITY_INVALID", message: "Google sign-in could not be verified" });
      }
      // PRESERVE user custom name, handle, and avatarUrl if updated by user!
      if (!user.name) user.name = googleName;
      if (!user.handle) user.handle = defaultHandle;
      if (!user.avatarUrl) user.avatarUrl = googleAvatar;
      user.verified = true;
      user.googleSubject = identity.subject;
      if (!user.referredBy && cleanRefCode) {
        user.referredBy = cleanRefCode;
        user.referralAppliedAt = new Date();
      }
      await user.save();
    }

    res.json({
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Could not authenticate with Google" });
  }
});

// Password Reset OTP Store
const otpStore = {}; // email -> { otp, expiresAt }

// Send Password Reset OTP
authRouter.post("/forgot-password/send-otp", async (req, res) => {
  try {
    const memoryStore = req.app.locals.memoryStore;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email address is required" });
    }

    const normalizedEmail = normalizeEmail(email);

    // Verify user exists
    let user = null;
    if (memoryStore) {
      const users = getMemoryUsers(memoryStore);
      user = users.find((u) => u.email === normalizedEmail);
    } else {
      user = await User.findOne({ email: normalizedEmail });
    }

    if (!user) {
      return res.status(444).json({ message: "No account found with this email address." });
    }

    // Generate 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[normalizedEmail] = {
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };

    console.log(`🔑 Password Reset OTP for ${normalizedEmail}: ${generatedOtp}`);

    // Dispatch real email via Nodemailer
    sendOtpEmail({
      toEmail: normalizedEmail,
      otp: generatedOtp,
      userName: user.name || "Learner"
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Verification OTP code has been sent to ${normalizedEmail}. Please check your email inbox.`
    });
  } catch (error) {
    res.status(500).json({ message: "Could not send OTP" });
  }
});

// Verify Password Reset OTP
authRouter.post("/forgot-password/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const stored = otpStore[normalizedEmail];

    if (!stored) {
      return res.status(400).json({ message: "No OTP request found for this email. Request a new OTP." });
    }

    if (Date.now() > stored.expiresAt) {
      delete otpStore[normalizedEmail];
      return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
    }

    if (stored.otp !== String(otp).trim()) {
      return res.status(400).json({ message: "Invalid OTP code. Please check and try again." });
    }

    res.json({
      success: true,
      message: "OTP verified successfully. You may now reset your password."
    });
  } catch (error) {
    res.status(500).json({ message: "Could not verify OTP" });
  }
});

// Reset Password with Verified OTP
authRouter.post("/forgot-password/reset-password", async (req, res) => {
  try {
    const memoryStore = req.app.locals.memoryStore;
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    const normalizedEmail = normalizeEmail(email);
    const stored = otpStore[normalizedEmail];

    if (!stored || stored.otp !== String(otp).trim()) {
      return res.status(400).json({ message: "Invalid or unverified OTP." });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    if (memoryStore) {
      const users = getMemoryUsers(memoryStore);
      const user = users.find((u) => u.email === normalizedEmail);
      if (user) {
        user.passwordHash = newPasswordHash;
      }
    } else {
      await User.updateOne({ email: normalizedEmail }, { passwordHash: newPasswordHash });
    }

    delete otpStore[normalizedEmail];

    res.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password."
    });
  } catch (error) {
    res.status(500).json({ message: "Could not reset password" });
  }
});

// Public Endpoint to Fetch All Partners & Collaborators
authRouter.get("/partners", async (req, res) => {
  try {
    const memoryStore = req.app.locals.memoryStore;
    if (memoryStore) {
      const users = memoryStore.users || [memoryStore.user].filter(Boolean);
      const partners = users.filter((u) => u.role === "partner").map(publicUser);
      return res.json({ partners });
    }

    const partners = await User.find({ role: "partner" }).sort({ createdAt: -1 });
    res.json({ partners: partners.map(publicUser) });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch partners", error: error.message });
  }
});

// Student Account Deletion Endpoint
authRouter.delete("/delete-account", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const role = req.user?.role;

    if (role && role !== "student") {
      return res.status(403).json({
        message: "Account deletion via Profile Settings is only available for Student accounts. Mentors and Institute Partners must contact support."
      });
    }

    const memoryStore = req.app.locals.memoryStore;
    if (memoryStore) {
      if (Array.isArray(memoryStore.users)) {
        memoryStore.users = memoryStore.users.filter((u) => String(u._id || u.id) !== String(userId));
      }
      if (memoryStore.user && String(memoryStore.user._id || memoryStore.user.id) === String(userId)) {
        memoryStore.user = null;
      }
    }

    try {
      await User.findByIdAndDelete(userId);
    } catch (e) {}

    res.json({
      success: true,
      message: "Your account has been deleted permanently."
    });
  } catch (error) {
    res.status(500).json({ message: "Could not delete account", error: error.message });
  }
});
