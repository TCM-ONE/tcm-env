import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import { authRouter } from "../src/routes/auth.js";
import { verifyGoogleIdToken, selfSignupRole } from "../src/services/googleIdentity.js";

test("Google identity accepts only verified, unexpired tokens for a configured audience", { concurrency: false }, async () => {
  const oldVerify = OAuth2Client.prototype.verifyIdToken;
  const oldAudiences = process.env.GOOGLE_OAUTH_CLIENT_IDS;
  process.env.GOOGLE_OAUTH_CLIENT_IDS = "web-client.apps.googleusercontent.com,native-client.apps.googleusercontent.com";
  const idToken = `${"a".repeat(40)}.${"b".repeat(80)}.${"c".repeat(40)}`;
  let claims = {
    aud: "web-client.apps.googleusercontent.com",
    sub: "google-subject-123",
    email: "Learner@Example.com",
    email_verified: "true",
    exp: String(Math.floor(Date.now() / 1000) + 300),
    name: "Verified Learner",
    picture: "https://example.test/avatar.png"
  };
  OAuth2Client.prototype.verifyIdToken = async ({ idToken: receivedToken, audience }) => {
    assert.equal(receivedToken, idToken);
    assert.deepEqual(audience, ["web-client.apps.googleusercontent.com", "native-client.apps.googleusercontent.com"]);
    if (!audience.includes(claims.aud) || Number(claims.exp) <= Math.floor(Date.now() / 1000)) throw new Error("Unverified identity token");
    return { getPayload: () => claims };
  };

  try {
    assert.deepEqual(await verifyGoogleIdToken(idToken), {
      subject: "google-subject-123",
      email: "learner@example.com",
      name: "Verified Learner",
      picture: "https://example.test/avatar.png"
    });
    claims = { ...claims, aud: "attacker-client.apps.googleusercontent.com" };
    assert.equal(await verifyGoogleIdToken(idToken), null);
    claims = { ...claims, aud: "native-client.apps.googleusercontent.com", email_verified: "false" };
    assert.equal(await verifyGoogleIdToken(idToken), null);
    claims = { ...claims, email_verified: "true", exp: String(Math.floor(Date.now() / 1000) - 1) };
    assert.equal(await verifyGoogleIdToken(idToken), null);
    assert.equal(await verifyGoogleIdToken("google_web_token"), null);
  } finally {
    OAuth2Client.prototype.verifyIdToken = oldVerify;
    if (oldAudiences === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_IDS;
    else process.env.GOOGLE_OAUTH_CLIENT_IDS = oldAudiences;
  }
});

test("public registration can request learner or mentor only", () => {
  assert.equal(selfSignupRole(undefined), "student");
  assert.equal(selfSignupRole("student"), "student");
  assert.equal(selfSignupRole("mentor"), "mentor");
  assert.equal(selfSignupRole("admin"), null);
  assert.equal(selfSignupRole("partner"), null);
});

test("auth routes reject caller-selected privileged roles and trust Google claims only", { concurrency: false }, async () => {
  const oldEnv = process.env.NODE_ENV;
  const oldVerify = OAuth2Client.prototype.verifyIdToken;
  process.env.NODE_ENV = "production";
  const idToken = `${"a".repeat(40)}.${"b".repeat(80)}.${"c".repeat(40)}`;
  let claims = {
    aud: "1018503930810-nuht0vf2crgh0k5e5da65f6hb4g3p7qn.apps.googleusercontent.com",
    sub: "verified-google-subject",
    email: "verified@example.test",
    email_verified: "true",
    exp: String(Math.floor(Date.now() / 1000) + 300),
    name: "Verified Person",
    picture: ""
  };
  OAuth2Client.prototype.verifyIdToken = async ({ idToken: value }) => {
    if (value.length < 100) throw new Error("Invalid token");
    return { getPayload: () => claims };
  };
  const app = express();
  app.use(express.json());
  app.locals.memoryStore = { users: [] };
  app.use("/api/auth", authRouter);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;

  try {
    const roleEscalation = await fetch(`${base}/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Attacker", email: "attacker@example.test", password: "password123", role: "admin" })
    });
    assert.equal(roleEscalation.status, 400);

    const spoofedGoogle = await fetch(`${base}/google`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "victim@example.test", idToken: "google_web_token", role: "student" })
    });
    assert.equal(spoofedGoogle.status, 401);
    assert.equal(app.locals.memoryStore.users.length, 0);

    const callerSelectedRole = await fetch(`${base}/google`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "attacker@example.test", idToken, role: "admin" })
    });
    assert.equal(callerSelectedRole.status, 400);
    assert.equal(app.locals.memoryStore.users.length, 0);

    const authenticated = await fetch(`${base}/google`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "victim@example.test", name: "Spoofed", idToken, role: "student" })
    });
    assert.equal(authenticated.status, 200);
    const user = app.locals.memoryStore.users[0];
    assert.equal(user.email, "verified@example.test");
    assert.equal(user.name, "Verified Person");
    assert.equal(user.googleSubject, "verified-google-subject");
    assert.equal(user.role, "student");

    claims = { ...claims, sub: "different-google-subject", name: "Different Person" };
    const differentIdToken = `${"x".repeat(40)}.${"y".repeat(80)}.${"z".repeat(40)}`;
    const conflictingIdentity = await fetch(`${base}/google`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: differentIdToken, role: "student" })
    });
    assert.equal(conflictingIdentity.status, 401);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    OAuth2Client.prototype.verifyIdToken = oldVerify;
    if (oldEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldEnv;
  }
});
