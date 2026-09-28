import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import { onboardingRouter } from "../src/routes/onboarding.js";
import { AuditLog } from "../src/models/AuditLog.js";
import { Cohort } from "../src/models/Cohort.js";
import { CohortInvitation } from "../src/models/CohortInvitation.js";
import { CohortMembership } from "../src/models/CohortMembership.js";
import { User } from "../src/models/User.js";

function queryResult(value) {
  const query = {
    select: () => query,
    lean: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject)
  };
  return query;
}

test("administrator invitations store only a token hash and can be revoked", { concurrency: false }, async () => {
  const oldEnv = process.env.NODE_ENV;
  const oldPublicOrigin = process.env.PUBLIC_ORIGIN;
  const oldAppOrigin = process.env.TCM_APP_ORIGIN;
  process.env.NODE_ENV = "production";
  process.env.PUBLIC_ORIGIN = "https://api.thecodemunk.in";
  delete process.env.TCM_APP_ORIGIN;
  const ids = {
    admin: "507f1f77bcf86cd799439011",
    mentor: "507f1f77bcf86cd799439012",
    cohort: "507f1f77bcf86cd799439021",
    invitation: "507f1f77bcf86cd799439031"
  };
  const users = {
    [ids.admin]: { _id: ids.admin, name: "Admin", email: "admin@example.test", role: "admin" },
    [ids.mentor]: { _id: ids.mentor, name: "Mentor", email: "mentor@example.test", role: "mentor" }
  };
  const cohort = { _id: ids.cohort, lifecycle: "enrolling", capacity: 25 };
  let createdInvitation;
  let storedInvitation = null;
  let memberships = 0;
  let audits = 0;
  const originals = {
    userFindById: User.findById,
    cohortFindById: Cohort.findById,
    invitationCount: CohortInvitation.countDocuments,
    invitationCreate: CohortInvitation.create,
    invitationFindOne: CohortInvitation.findOne,
    membershipCount: CohortMembership.countDocuments,
    auditCreate: AuditLog.create
  };
  User.findById = (id) => queryResult(users[String(id)] || null);
  Cohort.findById = () => queryResult(cohort);
  CohortInvitation.countDocuments = async () => 0;
  CohortInvitation.create = async (data) => {
    storedInvitation = { _id: ids.invitation, status: "pending", ...data, save: async function save() {} };
    createdInvitation = storedInvitation;
    return storedInvitation;
  };
  CohortInvitation.findOne = () => storedInvitation?.status === "pending" ? storedInvitation : null;
  CohortMembership.countDocuments = async () => memberships;
  AuditLog.create = async (data) => {
    audits += 1;
    return { ...data, save: async () => {} };
  };

  const app = express();
  app.use(express.json());
  app.use("/api/onboarding", onboardingRouter);
  app.use((error, req, res, next) => res.status(500).json({ message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api/onboarding/${ids.cohort}/invitations`;
  const headers = (id) => ({ "Content-Type": "application/json", Authorization: `Bearer ${jwt.sign({ sub: id }, process.env.JWT_SECRET || "tcm_local_dev_secret_change_before_production")}` });

  try {
    const denied = await fetch(base, { method: "POST", headers: headers(ids.mentor), body: JSON.stringify({ email: "learner@example.test" }) });
    assert.equal(denied.status, 403);

    const created = await fetch(base, { method: "POST", headers: headers(ids.admin), body: JSON.stringify({ email: "Learner@Example.test" }) });
    assert.equal(created.status, 201);
    const response = await created.json();
    assert.equal(new URL(response.inviteUrl).origin, "https://app.thecodemunk.in");
    const returnedToken = new URLSearchParams(new URL(response.inviteUrl).hash.slice(1)).get("token");
    assert.match(returnedToken, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(storedInvitation.email, "learner@example.test");
    assert.equal(storedInvitation.tokenHash, createHash("sha256").update(returnedToken).digest("hex"));
    assert.equal(JSON.stringify(storedInvitation).includes(returnedToken), false);
    assert.equal(new Date(response.invitation.expiresAt).getTime() > Date.now(), true);
    assert.equal(audits, 1);

    const revoked = await fetch(`${base}/${ids.invitation}/revoke`, { method: "PATCH", headers: headers(ids.admin), body: "{}" });
    assert.equal(revoked.status, 200);
    assert.equal((await revoked.json()).invitation.status, "revoked");
    assert.equal(storedInvitation.revokedAt instanceof Date, true);
    assert.equal(audits, 2);

    storedInvitation.status = "pending";
    memberships = cohort.capacity;
    const full = await fetch(base, { method: "POST", headers: headers(ids.admin), body: JSON.stringify({ email: "another@example.test" }) });
    assert.equal(full.status, 409);
    assert.equal((await full.json()).code, "COHORT_CAPACITY_REACHED");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    User.findById = originals.userFindById;
    Cohort.findById = originals.cohortFindById;
    CohortInvitation.countDocuments = originals.invitationCount;
    CohortInvitation.create = originals.invitationCreate;
    CohortInvitation.findOne = originals.invitationFindOne;
    CohortMembership.countDocuments = originals.membershipCount;
    AuditLog.create = originals.auditCreate;
    if (oldEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldEnv;
    if (oldPublicOrigin === undefined) delete process.env.PUBLIC_ORIGIN;
    else process.env.PUBLIC_ORIGIN = oldPublicOrigin;
    if (oldAppOrigin === undefined) delete process.env.TCM_APP_ORIGIN;
    else process.env.TCM_APP_ORIGIN = oldAppOrigin;
  }
});
