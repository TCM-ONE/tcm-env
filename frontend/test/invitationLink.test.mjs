import test from "node:test";
import assert from "node:assert/strict";
import { captureWebInvitationLink, parseInvitationLink } from "../src/services/invitationLink.mjs";

const token = "A".repeat(43);

test("parses the web invitation fragment without accepting malformed tokens", () => {
  assert.deepEqual(parseInvitationLink(`https://app.thecodemunk.in/onboarding/invite#token=${token}`), {
    isInvitation: true,
    token
  });
  assert.deepEqual(parseInvitationLink("https://app.thecodemunk.in/onboarding/invite#token=short"), {
    isInvitation: true,
    token: null
  });
  assert.deepEqual(parseInvitationLink(`https://app.thecodemunk.in/onboarding/invite?token=${token}`), {
    isInvitation: true,
    token: null
  });
  assert.equal(parseInvitationLink("https://app.thecodemunk.in/").isInvitation, false);
});

test("parses the optional native scheme route and removes bearer tokens from web history", () => {
  assert.deepEqual(parseInvitationLink(`com.tcm.app://onboarding/invite#token=${token}`), {
    isInvitation: true,
    token
  });

  let replacement;
  const captured = captureWebInvitationLink(
    { href: `https://app.thecodemunk.in/onboarding/invite?source=email#token=${token}` },
    { replaceState: (_state, _title, url) => { replacement = url; } }
  );
  assert.equal(captured.token, token);
  assert.equal(replacement, "/onboarding/invite?source=email");
});
