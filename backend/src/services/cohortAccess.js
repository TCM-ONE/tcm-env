import mongoose from "mongoose";
import { Cohort } from "../models/Cohort.js";
import { CohortMembership } from "../models/CohortMembership.js";

const ACTIVE_MEMBERSHIP_STATUSES = ["active", "completed"];
const ACCESSIBLE_COHORT_FIELDS = "courseId code title description lifecycle capacity timezone instructorIds startsAt endsAt enrollmentOpensAt enrollmentClosesAt";

export function userIdOf(user) {
  return String(user?._id || user?.id || "");
}

export function isAdmin(user) {
  return user?.role === "admin";
}

export function membershipIsAccessible(membership, now = new Date()) {
  if (!membership || !ACTIVE_MEMBERSHIP_STATUSES.includes(membership.status)) return false;
  if (membership.accessStartsAt) {
    const startsAt = new Date(membership.accessStartsAt);
    if (Number.isNaN(startsAt.getTime()) || startsAt > now) return false;
  }
  if (membership.accessEndsAt) {
    const endsAt = new Date(membership.accessEndsAt);
    if (Number.isNaN(endsAt.getTime()) || endsAt <= now) return false;
  }
  return true;
}

export async function resolveCohortAccess(user, cohortId, now = new Date()) {
  const userId = userIdOf(user);
  if (!userId || !mongoose.isValidObjectId(cohortId)) return null;

  const cohort = await Cohort.findById(cohortId).select(ACCESSIBLE_COHORT_FIELDS).lean();
  if (!cohort) return null;
  if (isAdmin(user)) return { kind: "admin", cohort, membership: null };

  const assigned = (cohort.instructorIds || []).some((id) => String(id) === userId);
  if (assigned && ["mentor", "partner"].includes(user.role)) {
    return { kind: "instructor", cohort, membership: null };
  }

  const membership = await CohortMembership.findOne({ cohortId: cohort._id, userId, role: "learner" }).lean();
  if (!["enrolling", "active", "completed"].includes(cohort.lifecycle) || !membershipIsAccessible(membership, now)) return null;
  return { kind: "learner", cohort, membership };
}

export function requireCohortAccess(allowedKinds = ["learner", "instructor", "admin"]) {
  return async (req, res, next) => {
    try {
      const access = await resolveCohortAccess(req.user, req.params.cohortId);
      if (!access || !allowedKinds.includes(access.kind)) {
        return res.status(404).json({ code: "COHORT_NOT_FOUND", message: "Cohort not found" });
      }
      req.cohortAccess = access;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
