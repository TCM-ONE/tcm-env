# Learner invitation and onboarding API (v1)

Base path: `/api/onboarding`. Every route requires a signed-in account. Invitation acceptance additionally requires the authenticated account email to exactly match the invitation's normalized email.

## Administrator invitation flow

### `POST /:cohortId/invitations`

Administrator only. Body: `{ "email": "learner@example.com", "expiresInDays": 7 }`. Expiry is limited to 1–30 days. The endpoint reserves cohort capacity, stores only a SHA-256 token hash, and returns the invitation URL once. The raw bearer token is placed in the URL fragment so it is not sent to web-server access logs; it is never persisted or written to audit metadata. Share the URL only with the invited learner.

### `PATCH /:cohortId/invitations/:invitationId/revoke`

Administrator only. Revokes an invitation that has not been accepted. Revoke and create actions are audit logged.

## Learner flow

### `POST /invitations/preview`

Body: `{ "token": "..." }`. Requires sign-in to a student account whose verified email matches the pending invitation. This endpoint does not consume the invitation. It returns a limited cohort/course summary, dates, timezone, and instructor names so the learner can confirm what they are joining before accepting. It does not return meeting links, pricing fields, invitation email, or the token. Invalid, expired, revoked, already-used, wrong-role, and email-mismatched invitations share the same public 404 response.

### `POST /invitations/accept`

Body: `{ "token": "..." }`. The frontend should read the token from the URL fragment and remove it from browser history before sending it. The token is single-use, expires, and is tied to the authenticated student account email. Invalid, expired, revoked, reused, wrong-role, and email-mismatched tokens share one public 404 response. Acceptance creates an invited membership with no class access.

### `GET /:cohortId`

Returns only the caller's onboarding form state, own membership status, required/optional fields, consent document versions, and the age gate. Learning goals and profile preferences remain private by default.

### `PUT /:cohortId/profile`

Supported fields:

- Required before completion: `preferredName`, `timezone`, `language`, `experienceLevel` (`beginner`, `some_experience`, `experienced`).
- Optional: `goal`, `communicationPreference` (`email`, `in_app`, `both`).
- Privacy controls: `profileVisibility` (`private`, `cohort`; default `private`) and `showProgressToCohort` (default `false`).

The form is saved incrementally and only the signed-in learner can read or change it.

### `POST /:cohortId/complete`

Requires `adultConfirmed`, `termsAccepted`, `privacyAccepted`, and `safeLabAccepted` all set to `true`, and all required profile fields. Under-18 learners remain blocked because no guardian flow exists. The server stores versioned consent evidence and activates only the membership created from the accepted invitation. Consent writes are idempotent, so a retry after a partial infrastructure failure does not duplicate evidence.

Current document versions are returned by `GET` and may be configured with `TCM_LEARNER_TERMS_VERSION`, `TCM_LEARNER_PRIVACY_VERSION`, and `TCM_SAFE_LAB_VERSION`. Product owners must publish and review the corresponding learner-facing text before inviting the public cohort.

## Account identity

Public registration only accepts learner or mentor roles. Google sign-in requires a valid Google ID token, an email Google marks verified, a configured token audience, and a stable Google subject. Client-supplied email/name/role values do not establish identity. Configure additional OAuth client IDs with the comma-separated server variable `GOOGLE_OAUTH_CLIENT_IDS` when platform builds use different audiences.
