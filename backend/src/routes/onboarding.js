import crypto from "node:crypto";
import express from "express";
import mongoose from "mongoose";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { AuditLog } from "../models/AuditLog.js";
import { Cohort } from "../models/Cohort.js";
import { CohortInvitation } from "../models/CohortInvitation.js";
import { CohortMembership } from "../models/CohortMembership.js";
import { Course } from "../models/Course.js";
import { LearnerConsent } from "../models/LearnerConsent.js";
import { LearnerOnboarding } from "../models/LearnerOnboarding.js";
import { User } from "../models/User.js";
import { beginAudit, finishAudit } from "../services/audit.js";
import { requireCohortAccess, userIdOf } from "../services/cohortAccess.js";

export const onboardingRouter = express.Router();

const TERMS_VERSION = process.env.TCM_LEARNER_TERMS_VERSION || "cybersecurity-cohort-terms-v1";
const PRIVACY_VERSION = process.env.TCM_LEARNER_PRIVACY_VERSION || "learner-privacy-v1";
const SAFE_LAB_VERSION = process.env.TCM_SAFE_LAB_VERSION || "cybersecurity-safe-lab-v1";
const ADULT_CONFIRMATION_VERSION = "adult-18plus-v1";
const inviteAttemptLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });

function learnerAppOrigin() {
  const configuredOrigin = process.env.TCM_APP_ORIGIN || "https://app.thecodemunk.in";
  const parsedOrigin = new URL(configuredOrigin);
  if (parsedOrigin.username || parsedOrigin.password || parsedOrigin.pathname !== "/" || parsedOrigin.search || parsedOrigin.hash) {
    throw new Error("TCM_APP_ORIGIN must be an origin URL without credentials, path, query or fragment");
  }
  if (process.env.NODE_ENV === "production" && parsedOrigin.protocol !== "https:") {
    throw new Error("TCM_APP_ORIGIN must use HTTPS in production");
  }
  return parsedOrigin.origin;
}

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validTimezone(value) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function unavailable(res) {
  return res.status(404).json({ code: "INVITATION_UNAVAILABLE", message: "This invitation is invalid, expired, already used, or unavailable for this account." });
}

function privateNotFound(res) {
  return res.status(404).json({ code: "ONBOARDING_NOT_FOUND", message: "Onboarding not found" });
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ code: "FORBIDDEN", message: "Administrator access required" });
  return next();
}

async function auditedMutation(req, details, mutate) {
  const audit = await beginAudit(req, details);
  try {
    const result = await mutate();
    await finishAudit(audit, "succeeded", details.targetId || result?._id);
    return result;
  } catch (error) {
    try {
      await finishAudit(audit, "failed", details.targetId);
    } catch (auditError) {
      error.auditCompletionError = auditError;
    }
    throw error;
  }
}

async function resolveOwnOnboarding(req) {
  const userId = userIdOf(req.user);
  if (!mongoose.isValidObjectId(req.params.cohortId) || !mongoose.isValidObjectId(userId)) return null;
  const membership = await CohortMembership.findOne({
    cohortId: req.params.cohortId,
    userId,
    role: "learner",
    status: { $in: ["invited", "active"] }
  }).lean();
  if (!membership) return null;
  const onboarding = await LearnerOnboarding.findOne({ userId, cohortId: membership.cohortId, membershipId: membership._id });
  if (!onboarding) return null;
  return { membership, onboarding };
}

onboardingRouter.use(requireAuth);

onboardingRouter.post("/:cohortId/invitations", requireAdmin, requireCohortAccess(["admin"]), async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const expiresInDays = req.body.expiresInDays === undefined ? 7 : Number(req.body.expiresInDays);
    if (!validEmail(email)) return res.status(400).json({ code: "INVALID_EMAIL", message: "Enter a valid learner email address" });
    if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
      return res.status(400).json({ code: "INVALID_EXPIRY", message: "expiresInDays must be from 1 to 30" });
    }
    if (!["enrolling", "active"].includes(req.cohortAccess.cohort.lifecycle)) {
      return res.status(409).json({ code: "COHORT_NOT_OPEN", message: "This cohort is not accepting invitations" });
    }

    const [occupiedMemberships, pendingInvitations] = await Promise.all([
      CohortMembership.countDocuments({
        cohortId: req.cohortAccess.cohort._id,
        role: "learner",
        status: { $in: ["invited", "active", "paused"] }
      }),
      CohortInvitation.countDocuments({
        cohortId: req.cohortAccess.cohort._id,
        status: "pending",
        expiresAt: { $gt: new Date() }
      })
    ]);
    if (occupiedMemberships + pendingInvitations >= req.cohortAccess.cohort.capacity) {
      return res.status(409).json({ code: "COHORT_CAPACITY_REACHED", message: "Cohort invitation capacity has been reached" });
    }

    const origin = learnerAppOrigin();
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const invitation = await auditedMutation(req, {
      action: "cohort.invitation.create",
      targetType: "CohortInvitation",
      cohortId: req.cohortAccess.cohort._id
    }, () => CohortInvitation.create({
      cohortId: req.cohortAccess.cohort._id,
      email,
      tokenHash,
      expiresAt,
      invitedBy: userIdOf(req.user)
    }));
    const inviteUrl = `${origin}/onboarding/invite#token=${encodeURIComponent(rawToken)}`;
    res.status(201).json({
      invitation: { id: invitation._id, email, cohortId: invitation.cohortId, expiresAt },
      inviteUrl
    });
  } catch (error) {
    next(error);
  }
});

onboardingRouter.patch("/:cohortId/invitations/:invitationId/revoke", requireAdmin, requireCohortAccess(["admin"]), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.invitationId)) return unavailable(res);
    const invitation = await CohortInvitation.findOne({
      _id: req.params.invitationId,
      cohortId: req.cohortAccess.cohort._id,
      status: "pending"
    });
    if (!invitation) return unavailable(res);

    const revoked = await auditedMutation(req, {
      action: "cohort.invitation.revoke",
      targetType: "CohortInvitation",
      targetId: invitation._id,
      cohortId: req.cohortAccess.cohort._id
    }, async () => {
      invitation.status = "revoked";
      invitation.revokedAt = new Date();
      await invitation.save();
      return invitation;
    });
    res.json({ invitation: { id: revoked._id, status: revoked.status, revokedAt: revoked.revokedAt } });
  } catch (error) {
    next(error);
  }
});

onboardingRouter.post("/invitations/preview", inviteAttemptLimit, async (req, res, next) => {
  try {
    const rawToken = req.body.token;
    const email = normalizeEmail(req.user?.email);
    if (typeof rawToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(rawToken) || !validEmail(email)) {
      return unavailable(res);
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const invitation = await CohortInvitation.findOne({
      tokenHash,
      email,
      status: "pending",
      expiresAt: { $gt: new Date() }
    }).select("cohortId").lean();
    if (!invitation) return unavailable(res);

    const cohort = await Cohort.findById(invitation.cohortId)
      .select("courseId title description lifecycle timezone startsAt endsAt instructorIds")
      .lean();
    if (!cohort || !["enrolling", "active"].includes(cohort.lifecycle)) return unavailable(res);

    const [course, instructors] = await Promise.all([
      Course.findById(cohort.courseId).select("title subtitle description level language duration").lean(),
      cohort.instructorIds?.length
        ? User.find({ _id: { $in: cohort.instructorIds }, role: { $in: ["mentor", "partner", "admin"] } }).select("name role").lean()
        : []
    ]);

    res.json({
      preview: {
        title: cohort.title,
        description: cohort.description || "",
        lifecycle: cohort.lifecycle,
        timezone: cohort.timezone,
        startsAt: cohort.startsAt,
        endsAt: cohort.endsAt,
        course: course ? {
          title: course.title,
          subtitle: course.subtitle || "",
          description: course.description || "",
          level: course.level || "",
          language: course.language || "",
          duration: course.duration || ""
        } : null,
        instructors: (instructors || []).map(({ _id, name, role }) => ({ id: _id, name, role }))
      }
    });
  } catch (error) {
    next(error);
  }
});

onboardingRouter.post("/invitations/accept", inviteAttemptLimit, async (req, res, next) => {
  try {
    const rawToken = req.body.token;
    const userId = userIdOf(req.user);
    const email = normalizeEmail(req.user?.email);
    if (typeof rawToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(rawToken) || !mongoose.isValidObjectId(userId) || !validEmail(email)) {
      return unavailable(res);
    }
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const now = new Date();
    const invitation = await CohortInvitation.findOne({
      tokenHash,
      email,
      status: "pending",
      expiresAt: { $gt: now }
    }).select("cohortId email invitedBy expiresAt").lean();
    if (!invitation) return unavailable(res);

    const cohort = await Cohort.findById(invitation.cohortId).select("lifecycle").lean();
    if (!cohort || !["enrolling", "active"].includes(cohort.lifecycle)) return unavailable(res);

    const existing = await CohortMembership.findOne({ cohortId: invitation.cohortId, userId, role: "learner" }).lean();
    if (existing && String(existing.invitationId || "") !== String(invitation._id)) return unavailable(res);

    const mutation = await beginAudit(req, {
      action: "cohort.invitation.accept",
      targetType: "CohortInvitation",
      targetId: undefined,
      cohortId: invitation.cohortId
    });
    try {
      const membership = existing || await CohortMembership.findOneAndUpdate(
        { cohortId: invitation.cohortId, userId, role: "learner" },
        { $setOnInsert: {
          cohortId: invitation.cohortId,
          userId,
          invitationId: invitation._id,
          role: "learner",
          status: "invited",
          enrollmentSource: "invitation",
          createdBy: invitation.invitedBy
        } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      if (String(membership.invitationId || "") !== String(invitation._id) || !["invited", "active"].includes(membership.status)) {
        await finishAudit(mutation, "failed", invitation._id);
        return unavailable(res);
      }

      const onboarding = await LearnerOnboarding.findOneAndUpdate(
        { userId, cohortId: invitation.cohortId },
        { $setOnInsert: {
          userId,
          cohortId: invitation.cohortId,
          membershipId: membership._id,
          invitationId: invitation._id,
          status: "in_progress"
        } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      if (String(onboarding.invitationId) !== String(invitation._id) || String(onboarding.membershipId) !== String(membership._id)) {
        await finishAudit(mutation, "failed", invitation._id);
        return unavailable(res);
      }

      const consumed = await CohortInvitation.findOneAndUpdate(
        { _id: invitation._id, tokenHash, email, status: "pending", expiresAt: { $gt: new Date() } },
        { $set: { status: "accepted", acceptedAt: new Date(), acceptedBy: userId } },
        { new: true }
      );
      if (!consumed) {
        await finishAudit(mutation, "failed", invitation._id);
        return unavailable(res);
      }
      await finishAudit(mutation, "succeeded", invitation._id);
      return res.status(200).json({ cohortId: invitation.cohortId, onboardingStatus: onboarding.status });
    } catch (error) {
      try { await finishAudit(mutation, "failed", invitation._id); } catch {}
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

onboardingRouter.get("/:cohortId", async (req, res, next) => {
  try {
    const resolved = await resolveOwnOnboarding(req);
    if (!resolved) return privateNotFound(res);
    const consentRecords = await LearnerConsent.find({
      userId: userIdOf(req.user),
      cohortId: resolved.membership.cohortId
    }).select("type documentVersion acceptedAt").lean();
    const acceptedVersions = new Map(consentRecords.map((record) => [record.type, record.documentVersion]));
    res.json({
      onboarding: {
        status: resolved.onboarding.status,
        profile: {
          preferredName: resolved.onboarding.preferredName || "",
          timezone: resolved.onboarding.timezone || "",
          language: resolved.onboarding.language || "",
          goal: resolved.onboarding.goal || "",
          experienceLevel: resolved.onboarding.experienceLevel || "",
          communicationPreference: resolved.onboarding.communicationPreference || "",
          profileVisibility: resolved.onboarding.profileVisibility,
          showProgressToCohort: resolved.onboarding.showProgressToCohort
        },
        requiredFields: ["preferredName", "timezone", "language", "experienceLevel"],
        optionalFields: ["goal", "communicationPreference"],
        consents: {
          terms: { version: TERMS_VERSION, accepted: acceptedVersions.get("terms") === TERMS_VERSION },
          privacy: { version: PRIVACY_VERSION, accepted: acceptedVersions.get("privacy") === PRIVACY_VERSION },
          safeLab: { version: SAFE_LAB_VERSION, accepted: acceptedVersions.get("safe_lab") === SAFE_LAB_VERSION },
          adultConfirmation: { version: ADULT_CONFIRMATION_VERSION, accepted: acceptedVersions.get("adult_confirmation") === ADULT_CONFIRMATION_VERSION }
        },
        ageGate: { minimumAge: 18, guardianFlowAvailable: false }
      },
      membershipStatus: resolved.membership.status
    });
  } catch (error) {
    next(error);
  }
});

onboardingRouter.put("/:cohortId/profile", async (req, res, next) => {
  try {
    const resolved = await resolveOwnOnboarding(req);
    if (!resolved) return privateNotFound(res);
    const allowed = new Set([
      "preferredName", "timezone", "language", "goal", "experienceLevel",
      "communicationPreference", "profileVisibility", "showProgressToCohort"
    ]);
    const supplied = Object.keys(req.body || {});
    if (!supplied.length || supplied.some((key) => !allowed.has(key))) {
      return res.status(400).json({ code: "INVALID_PROFILE", message: "Provide only supported learning profile fields" });
    }

    const updates = {};
    if (req.body.preferredName !== undefined) {
      if (typeof req.body.preferredName !== "string" || !req.body.preferredName.trim() || req.body.preferredName.trim().length > 80) {
        return res.status(400).json({ code: "INVALID_PROFILE", message: "preferredName is required and must not exceed 80 characters" });
      }
      updates.preferredName = req.body.preferredName.trim();
    }
    if (req.body.timezone !== undefined) {
      if (typeof req.body.timezone !== "string" || !validTimezone(req.body.timezone)) return res.status(400).json({ code: "INVALID_PROFILE", message: "timezone must be a valid IANA time zone" });
      updates.timezone = req.body.timezone;
    }
    if (req.body.language !== undefined) {
      if (typeof req.body.language !== "string" || !req.body.language.trim() || req.body.language.trim().length > 50) return res.status(400).json({ code: "INVALID_PROFILE", message: "language is required and must not exceed 50 characters" });
      updates.language = req.body.language.trim();
    }
    if (req.body.goal !== undefined) {
      if (typeof req.body.goal !== "string" || req.body.goal.trim().length > 1000) return res.status(400).json({ code: "INVALID_PROFILE", message: "goal must not exceed 1000 characters" });
      updates.goal = req.body.goal.trim();
    }
    if (req.body.experienceLevel !== undefined) {
      if (!["beginner", "some_experience", "experienced"].includes(req.body.experienceLevel)) return res.status(400).json({ code: "INVALID_PROFILE", message: "experienceLevel is invalid" });
      updates.experienceLevel = req.body.experienceLevel;
    }
    if (req.body.communicationPreference !== undefined) {
      if (!["email", "in_app", "both"].includes(req.body.communicationPreference)) return res.status(400).json({ code: "INVALID_PROFILE", message: "communicationPreference is invalid" });
      updates.communicationPreference = req.body.communicationPreference;
    }
    if (req.body.profileVisibility !== undefined) {
      if (!["private", "cohort"].includes(req.body.profileVisibility)) return res.status(400).json({ code: "INVALID_PROFILE", message: "profileVisibility is invalid" });
      updates.profileVisibility = req.body.profileVisibility;
    }
    if (req.body.showProgressToCohort !== undefined) {
      if (typeof req.body.showProgressToCohort !== "boolean") return res.status(400).json({ code: "INVALID_PROFILE", message: "showProgressToCohort must be boolean" });
      updates.showProgressToCohort = req.body.showProgressToCohort;
    }

    const updated = await auditedMutation(req, {
      action: "cohort.onboarding.profile.update",
      targetType: "LearnerOnboarding",
      targetId: resolved.onboarding._id,
      cohortId: resolved.membership.cohortId,
      metadata: { fields: Object.keys(updates) }
    }, async () => {
      Object.assign(resolved.onboarding, updates);
      await resolved.onboarding.save();
      return resolved.onboarding;
    });
    res.json({ profile: Object.fromEntries([...allowed].filter((key) => updated[key] !== undefined).map((key) => [key, updated[key]])) });
  } catch (error) {
    next(error);
  }
});

onboardingRouter.post("/:cohortId/complete", async (req, res, next) => {
  try {
    const resolved = await resolveOwnOnboarding(req);
    if (!resolved) return privateNotFound(res);
    if (req.body.adultConfirmed !== true) {
      return res.status(403).json({ code: "GUARDIAN_FLOW_REQUIRED", message: "This cohort currently accepts learners who confirm they are 18 or older. A guardian consent flow is not available yet." });
    }
    if (req.body.termsAccepted !== true || req.body.privacyAccepted !== true || req.body.safeLabAccepted !== true) {
      return res.status(400).json({ code: "CONSENT_REQUIRED", message: "Accept the current terms, privacy notice, and safe-lab rules to continue" });
    }
    const onboarding = resolved.onboarding;
    if (!onboarding.preferredName || !onboarding.timezone || !onboarding.language || !onboarding.experienceLevel) {
      return res.status(400).json({ code: "PROFILE_INCOMPLETE", message: "Complete the required learning profile fields first" });
    }
    if (resolved.membership.status === "active") {
      if (onboarding.status === "completed") return res.json({ completed: true, membershipStatus: "active" });
      const priorConsents = await LearnerConsent.find({
        userId: userIdOf(req.user),
        cohortId: resolved.membership.cohortId
      }).select("type documentVersion").lean();
      const consentKeys = new Set(priorConsents.map((record) => `${record.type}:${record.documentVersion}`));
      const completedConsents = [
        `terms:${TERMS_VERSION}`,
        `privacy:${PRIVACY_VERSION}`,
        `safe_lab:${SAFE_LAB_VERSION}`,
        `adult_confirmation:${ADULT_CONFIRMATION_VERSION}`
      ].every((key) => consentKeys.has(key));
      if (!completedConsents) {
        return res.status(409).json({ code: "ONBOARDING_STATE_REQUIRES_REVIEW", message: "Cohort access is active, but onboarding records need administrator review" });
      }
      onboarding.status = "completed";
      onboarding.completedAt = new Date();
      await onboarding.save();
      return res.json({ completed: true, membershipStatus: "active" });
    }
    if (resolved.membership.status !== "invited") return privateNotFound(res);

    const userId = userIdOf(req.user);
    const acceptedAt = new Date();
    const consentDocuments = [
      ["terms", TERMS_VERSION],
      ["privacy", PRIVACY_VERSION],
      ["safe_lab", SAFE_LAB_VERSION],
      ["adult_confirmation", ADULT_CONFIRMATION_VERSION]
    ];
    const audit = await beginAudit(req, {
      action: "cohort.onboarding.complete",
      targetType: "LearnerOnboarding",
      targetId: onboarding._id,
      cohortId: resolved.membership.cohortId
    });
    try {
      await Promise.all(consentDocuments.map(([type, documentVersion]) => LearnerConsent.updateOne(
        { userId, cohortId: resolved.membership.cohortId, type, documentVersion },
        { $setOnInsert: {
          userId,
          cohortId: resolved.membership.cohortId,
          membershipId: resolved.membership._id,
          invitationId: onboarding.invitationId,
          type,
          documentVersion,
          acceptedAt,
          ip: req.ip,
          userAgent: req.get("user-agent") || undefined
        } },
        { upsert: true }
      )));

      const activated = await CohortMembership.findOneAndUpdate(
        { _id: resolved.membership._id, userId, status: "invited", invitationId: onboarding.invitationId },
        { $set: { status: "active", activatedAt: acceptedAt } },
        { new: true }
      );
      if (!activated) {
        const current = await CohortMembership.findOne({ _id: resolved.membership._id, userId }).lean();
        if (current?.status === "active" && String(current.invitationId) === String(onboarding.invitationId)) {
          onboarding.status = "completed";
          onboarding.completedAt = acceptedAt;
          await onboarding.save();
          await finishAudit(audit, "succeeded", onboarding._id);
          return res.json({ completed: true, membershipStatus: "active" });
        }
        await finishAudit(audit, "failed", onboarding._id);
        return privateNotFound(res);
      }
      onboarding.status = "completed";
      onboarding.completedAt = acceptedAt;
      await onboarding.save();
      await finishAudit(audit, "succeeded", onboarding._id);
      return res.json({ completed: true, membershipStatus: activated.status });
    } catch (error) {
      try { await finishAudit(audit, "failed", onboarding._id); } catch {}
      throw error;
    }
  } catch (error) {
    next(error);
  }
});
