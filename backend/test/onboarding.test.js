import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import { onboardingRouter } from "../src/routes/onboarding.js";
import { AuditLog } from "../src/models/AuditLog.js";
import { Cohort } from "../src/models/Cohort.js";
import { CohortInvitation } from "../src/models/CohortInvitation.js";
import { CohortMembership } from "../src/models/CohortMembership.js";
import { Course } from "../src/models/Course.js";
import { LearnerConsent } from "../src/models/LearnerConsent.js";
import { LearnerOnboarding } from "../src/models/LearnerOnboarding.js";
import { User } from "../src/models/User.js";

function queryResult(value) {
  const query = {
    select: () => query,
    lean: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject)
  };
  return query;
}

test("invitation acceptance is email-bound, one-use, resumable, private, and gated by consent", { concurrency: false }, async () => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const ids = {
    user: "507f1f77bcf86cd799439011",
    other: "507f1f77bcf86cd799439012",
    cohort: "507f1f77bcf86cd799439021",
    invitation: "507f1f77bcf86cd799439031",
    membership: "507f1f77bcf86cd799439041",
    onboarding: "507f1f77bcf86cd799439051",
    course: "507f1f77bcf86cd799439061",
    instructor: "507f1f77bcf86cd799439071"
  };
  const token = "A".repeat(43);
  const tokenHash = (await import("node:crypto")).createHash("sha256").update(token).digest("hex");
  const user = { _id: ids.user, email: "learner@example.test", name: "Learner", role: "student" };
  const cohort = {
    _id: ids.cohort,
    courseId: ids.course,
    title: "Cybersecurity Foundations — September Cohort",
    description: "A two-month, instructor-led introduction to defensive security.",
    lifecycle: "enrolling",
    timezone: "Asia/Kolkata",
    startsAt: new Date("2026-10-01T12:00:00.000Z"),
    endsAt: new Date("2026-11-30T12:00:00.000Z"),
    instructorIds: [ids.instructor]
  };
  const course = { title: "Cybersecurity Basics", subtitle: "Learn security fundamentals safely", description: "Build a foundation in practical cybersecurity.", level: "Beginner", language: "English", duration: "2 months" };
  let invitationStatus = "pending";
  let invitationExpired = false;
  let membershipStatus = "invited";
  let onboarding = {
    _id: ids.onboarding,
    userId: ids.user,
    cohortId: ids.cohort,
    membershipId: ids.membership,
    invitationId: ids.invitation,
    status: "in_progress",
    profileVisibility: "private",
    showProgressToCohort: false,
    save: async function save() {}
  };
  let consentWrites = 0;
  let auditWrites = 0;
  const originals = {
    userFindById: User.findById,
    userFind: User.find,
    courseFindById: Course.findById,
    invitationFindOne: CohortInvitation.findOne,
    invitationFindOneAndUpdate: CohortInvitation.findOneAndUpdate,
    cohortFindById: Cohort.findById,
    membershipFindOne: CohortMembership.findOne,
    membershipFindOneAndUpdate: CohortMembership.findOneAndUpdate,
    onboardingFindOne: LearnerOnboarding.findOne,
    onboardingFindOneAndUpdate: LearnerOnboarding.findOneAndUpdate,
    consentFind: LearnerConsent.find,
    consentUpdateOne: LearnerConsent.updateOne,
    auditCreate: AuditLog.create
  };
  User.findById = (id) => queryResult(String(id) === ids.user ? user : String(id) === ids.other ? { ...user, _id: ids.other, email: "other@example.test" } : null);
  User.find = () => queryResult([{ _id: ids.instructor, name: "TCM Instructor", role: "mentor" }]);
  Course.findById = () => queryResult(course);
  CohortInvitation.findOne = (filter) => queryResult(
    filter.email === user.email && invitationStatus === "pending" && !invitationExpired && filter.tokenHash === tokenHash
      ? { _id: ids.invitation, cohortId: ids.cohort, invitedBy: ids.user, expiresAt: new Date(Date.now() + 3600000) }
      : null
  );
  CohortInvitation.findOneAndUpdate = async (filter, update) => {
    if (invitationStatus !== "pending" || filter.email !== user.email || filter.tokenHash !== tokenHash) return null;
    invitationStatus = "accepted";
    return { _id: ids.invitation, ...update.$set };
  };
  Cohort.findById = () => queryResult(cohort);
  CohortMembership.findOne = (filter) => queryResult(
    String(filter.userId) === ids.user && String(filter.cohortId) === ids.cohort && membershipStatus !== "missing"
      ? { _id: ids.membership, cohortId: ids.cohort, userId: ids.user, invitationId: ids.invitation, status: membershipStatus }
      : null
  );
  CohortMembership.findOneAndUpdate = async (filter, update) => {
    if (update.$setOnInsert) {
      return { _id: ids.membership, ...update.$setOnInsert };
    }
    if (membershipStatus !== "invited" || filter.invitationId !== ids.invitation) return null;
    membershipStatus = "active";
    return { _id: ids.membership, status: membershipStatus };
  };
  LearnerOnboarding.findOne = () => queryResult(onboarding);
  LearnerOnboarding.findOneAndUpdate = async (_filter, update) => {
    onboarding = { _id: ids.onboarding, ...update.$setOnInsert, profileVisibility: "private", showProgressToCohort: false, save: async function save() {} };
    return onboarding;
  };
  LearnerConsent.find = () => queryResult([]);
  LearnerConsent.updateOne = async () => { consentWrites += 1; return { acknowledged: true }; };
  AuditLog.create = async (data) => {
    auditWrites += 1;
    return { ...data, save: async () => {} };
  };

  const app = express();
  app.use(express.json());
  app.use("/api/onboarding", onboardingRouter);
  app.use((error, req, res, next) => res.status(500).json({ message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api/onboarding`;
  const auth = (subject = ids.user) => ({ "Content-Type": "application/json", Authorization: `Bearer ${jwt.sign({ sub: subject }, process.env.JWT_SECRET || "tcm_local_dev_secret_change_before_production")}` });

  try {
    const malformed = await fetch(`${base}/invitations/accept`, { method: "POST", headers: auth(), body: JSON.stringify({ token: "google_web_token" }) });
    assert.equal(malformed.status, 404);

    const mismatch = await fetch(`${base}/invitations/accept`, { method: "POST", headers: auth(ids.other), body: JSON.stringify({ token }) });
    assert.equal(mismatch.status, 404);
    assert.equal((await mismatch.json()).code, "INVITATION_UNAVAILABLE");

    invitationExpired = true;
    const expired = await fetch(`${base}/invitations/accept`, { method: "POST", headers: auth(), body: JSON.stringify({ token }) });
    assert.equal(expired.status, 404);
    assert.equal((await expired.json()).code, "INVITATION_UNAVAILABLE");
    const expiredPreview = await fetch(`${base}/invitations/preview`, { method: "POST", headers: auth(), body: JSON.stringify({ token }) });
    assert.equal(expiredPreview.status, 404);
    assert.equal((await expiredPreview.json()).code, "INVITATION_UNAVAILABLE");
    invitationExpired = false;

    const mismatchPreview = await fetch(`${base}/invitations/preview`, { method: "POST", headers: auth(ids.other), body: JSON.stringify({ token }) });
    assert.equal(mismatchPreview.status, 404);
    assert.equal((await mismatchPreview.json()).code, "INVITATION_UNAVAILABLE");

    const previewResponse = await fetch(`${base}/invitations/preview`, { method: "POST", headers: auth(), body: JSON.stringify({ token }) });
    assert.equal(previewResponse.status, 200);
    const preview = (await previewResponse.json()).preview;
    assert.equal(preview.title, cohort.title);
    assert.equal(preview.course.title, course.title);
    assert.equal(preview.instructors[0].name, "TCM Instructor");
    assert.equal(preview.lifecycle, "enrolling");
    assert.equal(invitationStatus, "pending");
    assert.equal(JSON.stringify(preview).includes(user.email), false);
    assert.equal(JSON.stringify(preview).includes(token), false);

    const accepted = await fetch(`${base}/invitations/accept`, { method: "POST", headers: auth(), body: JSON.stringify({ token }) });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).onboardingStatus, "in_progress");
    assert.equal(invitationStatus, "accepted");

    const reused = await fetch(`${base}/invitations/accept`, { method: "POST", headers: auth(), body: JSON.stringify({ token }) });
    assert.equal(reused.status, 404);
    assert.equal((await reused.json()).code, "INVITATION_UNAVAILABLE");

    let status = await fetch(`${base}/${ids.cohort}`, { headers: auth() });
    assert.equal(status.status, 200);
    const initial = await status.json();
    assert.equal(initial.onboarding.profile.profileVisibility, "private");
    assert.equal(initial.onboarding.profile.showProgressToCohort, false);
    assert.deepEqual(initial.onboarding.requiredFields, ["preferredName", "timezone", "language", "experienceLevel"]);

    const saved = await fetch(`${base}/${ids.cohort}/profile`, {
      method: "PUT", headers: auth(),
      body: JSON.stringify({ preferredName: "Learner", timezone: "Asia/Kolkata", language: "English", experienceLevel: "beginner" })
    });
    assert.equal(saved.status, 200);
    assert.equal(onboarding.preferredName, "Learner");
    assert.equal(onboarding.profileVisibility, "private");

    const underAge = await fetch(`${base}/${ids.cohort}/complete`, { method: "POST", headers: auth(), body: JSON.stringify({ adultConfirmed: false }) });
    assert.equal(underAge.status, 403);
    assert.equal((await underAge.json()).code, "GUARDIAN_FLOW_REQUIRED");
    assert.equal(membershipStatus, "invited");
    assert.equal(consentWrites, 0);

    const missingConsent = await fetch(`${base}/${ids.cohort}/complete`, {
      method: "POST", headers: auth(), body: JSON.stringify({ adultConfirmed: true, termsAccepted: true, privacyAccepted: true })
    });
    assert.equal(missingConsent.status, 400);
    assert.equal((await missingConsent.json()).code, "CONSENT_REQUIRED");
    assert.equal(membershipStatus, "invited");

    const completed = await fetch(`${base}/${ids.cohort}/complete`, {
      method: "POST", headers: auth(),
      body: JSON.stringify({ adultConfirmed: true, termsAccepted: true, privacyAccepted: true, safeLabAccepted: true })
    });
    assert.equal(completed.status, 200);
    assert.equal((await completed.json()).membershipStatus, "active");
    assert.equal(consentWrites, 4);
    assert.equal(auditWrites >= 3, true);

    const otherLearner = await fetch(`${base}/${ids.cohort}`, { headers: auth(ids.other) });
    assert.equal(otherLearner.status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    User.findById = originals.userFindById;
    User.find = originals.userFind;
    Course.findById = originals.courseFindById;
    CohortInvitation.findOne = originals.invitationFindOne;
    CohortInvitation.findOneAndUpdate = originals.invitationFindOneAndUpdate;
    Cohort.findById = originals.cohortFindById;
    CohortMembership.findOne = originals.membershipFindOne;
    CohortMembership.findOneAndUpdate = originals.membershipFindOneAndUpdate;
    LearnerOnboarding.findOne = originals.onboardingFindOne;
    LearnerOnboarding.findOneAndUpdate = originals.onboardingFindOneAndUpdate;
    LearnerConsent.find = originals.consentFind;
    LearnerConsent.updateOne = originals.consentUpdateOne;
    AuditLog.create = originals.auditCreate;
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }
});
