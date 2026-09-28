import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Cohort } from "../models/Cohort.js";
import { CohortMembership } from "../models/CohortMembership.js";
import { Course } from "../models/Course.js";
import { LiveSession } from "../models/LiveSession.js";
import { User } from "../models/User.js";
import { beginAudit, finishAudit } from "../services/audit.js";
import { isAdmin, membershipIsAccessible, requireCohortAccess, userIdOf } from "../services/cohortAccess.js";

export const cohortsRouter = express.Router();

const COHORT_FIELDS = "courseId code title description lifecycle capacity timezone instructorIds startsAt endsAt enrollmentOpensAt enrollmentClosesAt";
const SESSION_FIELDS = "title description host sessionDate startTime endTime meetingUrl recordingUrl status";

function badRequest(res, message) {
  return res.status(400).json({ code: "INVALID_REQUEST", message });
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) return res.status(403).json({ code: "FORBIDDEN", message: "Administrator access required" });
  return next();
}

function asDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function uniqueObjectIds(values = []) {
  return [...new Set(values.map(String))].filter((value) => mongoose.isValidObjectId(value));
}

function validTimezone(value) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
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

cohortsRouter.use(requireAuth);

cohortsRouter.get("/mine", async (req, res, next) => {
  try {
    const userId = userIdOf(req.user);
    const now = new Date();
    const memberships = await CohortMembership.find({ userId, role: "learner", status: { $in: ["active", "completed"] } })
      .select("cohortId role status accessStartsAt accessEndsAt activatedAt")
      .lean();
    const accessibleMemberships = memberships.filter((membership) => membershipIsAccessible(membership, now));
    const membershipByCohort = new Map(accessibleMemberships.map((membership) => [String(membership.cohortId), membership]));
    const filters = [{
      _id: { $in: [...membershipByCohort.keys()] },
      lifecycle: { $in: ["enrolling", "active", "completed"] }
    }];

    if (["mentor", "partner"].includes(req.user.role)) filters.push({ instructorIds: userId });
    const query = isAdmin(req.user) ? {} : { $or: filters };
    const cohorts = await Cohort.find(query).select(COHORT_FIELDS).sort({ startsAt: -1 }).limit(100).lean();

    res.json({
      cohorts: cohorts.map((cohort) => ({
        ...cohort,
        accessKind: isAdmin(req.user)
          ? "admin"
          : (cohort.instructorIds || []).some((id) => String(id) === userId) && ["mentor", "partner"].includes(req.user.role)
            ? "instructor"
            : "learner",
        membership: membershipByCohort.get(String(cohort._id)) || undefined
      }))
    });
  } catch (error) {
    next(error);
  }
});

cohortsRouter.get("/:cohortId/home", requireCohortAccess(), async (req, res, next) => {
  try {
    const sessions = await LiveSession.find({ cohortId: req.cohortAccess.cohort._id })
      .select(`+meetingUrl ${SESSION_FIELDS}`)
      .sort({ sessionDate: 1 })
      .limit(100)
      .lean();
    res.json({
      cohort: req.cohortAccess.cohort,
      accessKind: req.cohortAccess.kind,
      membership: req.cohortAccess.membership || undefined,
      sessions
    });
  } catch (error) {
    next(error);
  }
});

cohortsRouter.post("/", requireAdmin, async (req, res, next) => {
  try {
    if (req.body.instructorIds !== undefined && !Array.isArray(req.body.instructorIds)) return badRequest(res, "instructorIds must be an array");
    const startsAt = asDate(req.body.startsAt);
    const endsAt = asDate(req.body.endsAt);
    const enrollmentOpensAt = asDate(req.body.enrollmentOpensAt);
    const enrollmentClosesAt = asDate(req.body.enrollmentClosesAt);
    const instructorIds = uniqueObjectIds(req.body.instructorIds);
    const capacity = Number(req.body.capacity);
    const courseId = String(req.body.courseId || "");
    const timezone = String(req.body.timezone || "Asia/Kolkata");
    const lifecycle = req.body.lifecycle || "draft";

    if (!mongoose.isValidObjectId(courseId)) return badRequest(res, "A valid courseId is required");
    if (typeof req.body.code !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(req.body.code.trim())) return badRequest(res, "code must contain only letters, numbers, underscores, or hyphens");
    if (typeof req.body.title !== "string" || !req.body.title.trim() || req.body.title.trim().length > 160) return badRequest(res, "title is required and must not exceed 160 characters");
    if (req.body.description !== undefined && (typeof req.body.description !== "string" || req.body.description.length > 4000)) return badRequest(res, "description must not exceed 4000 characters");
    if (!startsAt || !endsAt || endsAt <= startsAt) return badRequest(res, "Valid startsAt and endsAt dates are required");
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) return badRequest(res, "capacity must be an integer from 1 to 10000");
    if (!validTimezone(timezone)) return badRequest(res, "timezone must be a valid IANA time zone");
    if (!["draft", "enrolling", "active", "completed", "cancelled", "archived"].includes(lifecycle)) return badRequest(res, "lifecycle is invalid");
    if ((req.body.instructorIds || []).length !== instructorIds.length) return badRequest(res, "All instructorIds must be valid and unique");
    if (enrollmentOpensAt === null || enrollmentClosesAt === null) return badRequest(res, "Enrollment dates must be valid");
    if (enrollmentOpensAt && enrollmentClosesAt && enrollmentClosesAt <= enrollmentOpensAt) return badRequest(res, "enrollmentClosesAt must be after enrollmentOpensAt");

    const [course, instructorCount] = await Promise.all([
      Course.exists({ _id: courseId }),
      instructorIds.length ? User.countDocuments({ _id: { $in: instructorIds }, role: { $in: ["mentor", "partner", "admin"] } }) : 0
    ]);
    if (!course) return badRequest(res, "courseId does not reference an existing course");
    if (instructorCount !== instructorIds.length) return badRequest(res, "Every instructor must reference an eligible user");

    const cohort = await auditedMutation(req, {
      action: "cohort.create",
      targetType: "Cohort",
      metadata: { code: String(req.body.code).trim().toUpperCase() }
    }, () => Cohort.create({
      courseId,
      code: req.body.code,
      title: req.body.title,
      description: req.body.description,
      lifecycle,
      capacity,
      timezone,
      instructorIds,
      startsAt,
      endsAt,
      enrollmentOpensAt,
      enrollmentClosesAt,
      createdBy: userIdOf(req.user)
    }));
    res.status(201).json({ cohort });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ code: "COHORT_CODE_EXISTS", message: "A cohort with this code already exists" });
    next(error);
  }
});

cohortsRouter.post("/:cohortId/memberships", requireAdmin, requireCohortAccess(["admin"]), async (req, res, next) => {
  try {
    const userId = String(req.body.userId || "");
    if (!mongoose.isValidObjectId(userId)) return badRequest(res, "A valid userId is required");
    const existing = await CohortMembership.findOne({ cohortId: req.cohortAccess.cohort._id, userId, role: "learner" }).lean();
    if (existing) return res.status(200).json({ membership: existing, created: false });
    if (!await User.exists({ _id: userId })) return badRequest(res, "userId does not reference an existing user");

    const occupied = await CohortMembership.countDocuments({
      cohortId: req.cohortAccess.cohort._id,
      role: "learner",
      status: { $in: ["invited", "active", "paused"] }
    });
    if (occupied >= req.cohortAccess.cohort.capacity) {
      return res.status(409).json({ code: "COHORT_CAPACITY_REACHED", message: "Cohort capacity has been reached" });
    }

    const accessStartsAt = asDate(req.body.accessStartsAt);
    const accessEndsAt = asDate(req.body.accessEndsAt);
    if (accessStartsAt === null || accessEndsAt === null || (accessStartsAt && accessEndsAt && accessEndsAt <= accessStartsAt)) {
      return badRequest(res, "Access dates must be valid and accessEndsAt must be after accessStartsAt");
    }
    const status = req.body.status || "invited";
    if (!["invited", "active"].includes(status)) return badRequest(res, "Initial status must be invited or active");
    const enrollmentSource = req.body.enrollmentSource || "manual";
    if (!["manual", "legacy_mysql", "invitation", "self_enrolled", "admin_import"].includes(enrollmentSource)) return badRequest(res, "enrollmentSource is invalid");

    const membership = await auditedMutation(req, {
      action: "cohort.membership.create",
      targetType: "CohortMembership",
      cohortId: req.cohortAccess.cohort._id,
      metadata: { userId, enrollmentSource }
    }, () => CohortMembership.create({
      cohortId: req.cohortAccess.cohort._id,
      userId,
      role: "learner",
      status,
      enrollmentSource,
      accessStartsAt,
      accessEndsAt,
      activatedAt: status === "active" ? new Date() : undefined,
      createdBy: userIdOf(req.user)
    }));
    res.status(201).json({ membership, created: true });
  } catch (error) {
    if (error?.code === 11000) {
      const membership = await CohortMembership.findOne({ cohortId: req.cohortAccess.cohort._id, userId: req.body.userId, role: "learner" }).lean();
      return res.status(200).json({ membership, created: false });
    }
    next(error);
  }
});

cohortsRouter.patch("/:cohortId/memberships/:membershipId", requireAdmin, requireCohortAccess(["admin"]), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.membershipId)) return res.status(404).json({ code: "MEMBERSHIP_NOT_FOUND", message: "Membership not found" });
    const status = req.body.status;
    if (!["active", "paused", "completed", "revoked"].includes(status)) return badRequest(res, "A valid membership status is required");
    const membership = await CohortMembership.findOne({ _id: req.params.membershipId, cohortId: req.cohortAccess.cohort._id });
    if (!membership) return res.status(404).json({ code: "MEMBERSHIP_NOT_FOUND", message: "Membership not found" });

    const updated = await auditedMutation(req, {
      action: "cohort.membership.status.update",
      targetType: "CohortMembership",
      targetId: membership._id,
      cohortId: req.cohortAccess.cohort._id,
      metadata: { from: membership.status, to: status }
    }, async () => {
      membership.status = status;
      if (status === "active" && !membership.activatedAt) membership.activatedAt = new Date();
      await membership.save();
      return membership;
    });
    res.json({ membership: updated });
  } catch (error) {
    next(error);
  }
});
