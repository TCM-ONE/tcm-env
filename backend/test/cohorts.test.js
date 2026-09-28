import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import { cohortsRouter } from "../src/routes/cohorts.js";
import { AuditLog } from "../src/models/AuditLog.js";
import { Cohort } from "../src/models/Cohort.js";
import { CohortMembership } from "../src/models/CohortMembership.js";
import { LiveSession } from "../src/models/LiveSession.js";
import { User } from "../src/models/User.js";

function queryResult(value) {
  const query = {
    select: () => query,
    sort: () => query,
    limit: () => query,
    lean: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject)
  };
  return query;
}

test("cohort routes enforce learner, assigned-instructor and admin boundaries", { concurrency: false }, async () => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  const ids = {
    cohort: "507f1f77bcf86cd799439001",
    missingCohort: "507f1f77bcf86cd799439002",
    learner: "507f1f77bcf86cd799439011",
    other: "507f1f77bcf86cd799439012",
    instructor: "507f1f77bcf86cd799439013",
    unassigned: "507f1f77bcf86cd799439014",
    admin: "507f1f77bcf86cd799439015",
    target: "507f1f77bcf86cd799439016",
    membership: "507f1f77bcf86cd799439021"
  };
  const users = {
    [ids.learner]: { _id: ids.learner, name: "Learner", role: "student" },
    [ids.other]: { _id: ids.other, name: "Other learner", role: "student" },
    [ids.instructor]: { _id: ids.instructor, name: "Assigned instructor", role: "mentor" },
    [ids.unassigned]: { _id: ids.unassigned, name: "Unassigned instructor", role: "mentor" },
    [ids.admin]: { _id: ids.admin, name: "Administrator", role: "admin" }
  };
  const cohort = {
    _id: ids.cohort,
    courseId: "507f1f77bcf86cd799439031",
    code: "CYBER-01",
    title: "Cybersecurity Basics",
    lifecycle: "active",
    capacity: 25,
    timezone: "Asia/Kolkata",
    instructorIds: [ids.instructor],
    startsAt: new Date("2026-10-01T00:00:00.000Z"),
    endsAt: new Date("2026-12-01T00:00:00.000Z")
  };
  const learnerMembership = {
    _id: ids.membership,
    cohortId: ids.cohort,
    userId: ids.learner,
    role: "learner",
    status: "active"
  };

  const originals = {
    userFindById: User.findById,
    userExists: User.exists,
    cohortFindById: Cohort.findById,
    cohortFind: Cohort.find,
    membershipFindOne: CohortMembership.findOne,
    membershipFind: CohortMembership.find,
    membershipCount: CohortMembership.countDocuments,
    membershipCreate: CohortMembership.create,
    sessionFind: LiveSession.find,
    auditCreate: AuditLog.create
  };
  let duplicateMembership = true;
  let occupiedSeats = 1;
  let auditWrites = 0;
  let membershipCreates = 0;

  User.findById = (id) => queryResult(users[String(id)] || null);
  User.exists = async ({ _id }) => String(_id) === ids.target;
  Cohort.findById = (id) => queryResult(String(id) === ids.cohort ? cohort : null);
  Cohort.find = () => queryResult([cohort]);
  CohortMembership.find = () => queryResult([learnerMembership]);
  CohortMembership.findOne = (filter) => {
    if (String(filter._id || "") === ids.membership) return queryResult({ ...learnerMembership, status: "invited", save: async () => {} });
    const requestedUser = String(filter.userId);
    if (requestedUser === ids.learner) return queryResult(learnerMembership);
    if (requestedUser === ids.target && duplicateMembership) {
      return queryResult({ ...learnerMembership, _id: "507f1f77bcf86cd799439022", userId: ids.target });
    }
    return queryResult(null);
  };
  CohortMembership.countDocuments = async () => occupiedSeats;
  CohortMembership.create = async (data) => {
    membershipCreates += 1;
    return { _id: "507f1f77bcf86cd799439023", ...data };
  };
  LiveSession.find = () => queryResult([{ _id: "session-1", title: "Orientation", meetingUrl: "https://meet.google.com/example" }]);
  AuditLog.create = async (data) => {
    auditWrites += 1;
    return { ...data, save: async () => {} };
  };

  const app = express();
  app.use(express.json());
  app.use("/api/cohorts", cohortsRouter);
  app.use((error, req, res, next) => res.status(500).json({ message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api/cohorts`;
  const token = (sub) => jwt.sign({ sub }, process.env.JWT_SECRET || "tcm_local_dev_secret_change_before_production");
  const headers = (sub) => ({ "Content-Type": "application/json", Authorization: `Bearer ${token(sub)}` });

  try {
    assert.equal((await fetch(`${base}/${ids.cohort}/home`)).status, 401);

    const learnerResponse = await fetch(`${base}/${ids.cohort}/home`, { headers: headers(ids.learner) });
    assert.equal(learnerResponse.status, 200);
    const learnerHome = await learnerResponse.json();
    assert.equal(learnerHome.accessKind, "learner");
    assert.equal(learnerHome.membership.userId, ids.learner);
    assert.equal(learnerHome.sessions[0].meetingUrl, "https://meet.google.com/example");

    const mine = await fetch(`${base}/mine`, { headers: headers(ids.learner) });
    assert.equal(mine.status, 200);
    const mineBody = await mine.json();
    assert.equal(mineBody.cohorts.length, 1);
    assert.equal(mineBody.cohorts[0].membership.userId, ids.learner);
    assert.equal(JSON.stringify(mineBody).includes(ids.other), false);

    const denied = await fetch(`${base}/${ids.cohort}/home`, { headers: headers(ids.other) });
    const missing = await fetch(`${base}/${ids.missingCohort}/home`, { headers: headers(ids.other) });
    assert.equal(denied.status, 404);
    assert.equal(missing.status, 404);
    assert.deepEqual(await denied.json(), await missing.json());

    const assigned = await fetch(`${base}/${ids.cohort}/home`, { headers: headers(ids.instructor) });
    assert.equal(assigned.status, 200);
    assert.equal((await assigned.json()).accessKind, "instructor");
    assert.equal((await fetch(`${base}/${ids.cohort}/home`, { headers: headers(ids.unassigned) })).status, 404);

    const admin = await fetch(`${base}/${ids.cohort}/home`, { headers: headers(ids.admin) });
    assert.equal(admin.status, 200);
    assert.equal((await admin.json()).accessKind, "admin");

    const directEnrollment = await fetch(`${base}/${ids.cohort}/memberships`, {
      method: "POST", headers: headers(ids.admin), body: JSON.stringify({ userId: ids.target, status: "active" })
    });
    assert.equal(directEnrollment.status, 409);
    assert.equal((await directEnrollment.json()).code, "INVITATION_REQUIRED");
    const cannotSkipOnboarding = await fetch(`${base}/${ids.cohort}/memberships/${ids.membership}`, {
      method: "PATCH", headers: headers(ids.admin), body: JSON.stringify({ status: "completed" })
    });
    assert.equal(cannotSkipOnboarding.status, 409);
    assert.equal((await cannotSkipOnboarding.json()).code, "INVALID_MEMBERSHIP_TRANSITION");
    assert.equal(membershipCreates, 0);
    assert.equal(auditWrites, 0);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    User.findById = originals.userFindById;
    User.exists = originals.userExists;
    Cohort.findById = originals.cohortFindById;
    Cohort.find = originals.cohortFind;
    CohortMembership.findOne = originals.membershipFindOne;
    CohortMembership.find = originals.membershipFind;
    CohortMembership.countDocuments = originals.membershipCount;
    CohortMembership.create = originals.membershipCreate;
    LiveSession.find = originals.sessionFind;
    AuditLog.create = originals.auditCreate;
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }
});

test("membership access windows are enforced at both boundaries", async () => {
  const { membershipIsAccessible } = await import("../src/services/cohortAccess.js");
  const now = new Date("2026-10-15T12:00:00.000Z");
  assert.equal(membershipIsAccessible({ status: "active" }, now), true);
  assert.equal(membershipIsAccessible({ status: "invited" }, now), false);
  assert.equal(membershipIsAccessible({ status: "active", accessStartsAt: "2026-10-16T00:00:00.000Z" }, now), false);
  assert.equal(membershipIsAccessible({ status: "active", accessEndsAt: "2026-10-15T12:00:00.000Z" }, now), false);
  assert.equal(membershipIsAccessible({ status: "active", accessEndsAt: "not-a-date" }, now), false);
  assert.equal(membershipIsAccessible({ status: "completed", accessEndsAt: "2026-10-16T00:00:00.000Z" }, now), true);
});
