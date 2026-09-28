# Cohort foundation rollout and rollback

This change creates new `cohorts`, `cohortmemberships`, `auditlogs`, `cohortinvitations`, `learneronboardings`, and `learnerconsents` collections; adds an optional `cohortId` and `invitationId` to new documents; and adds a sparse unique Google subject index to `users`. It does not rewrite or delete existing data. The sparse index omits existing users without a Google subject.

## Rollout

1. Deploy the backend while existing course and enrollment APIs remain the source of truth.
2. Verify `/api/health`, authenticated cohort authorization, and Google sign-in with a real token for the configured OAuth audience.
3. Create the pilot cohort through the audited admin API.
4. Create invitations for the approved learner emails and reconcile pending invitations against cohort capacity.
5. Have learners complete onboarding; reconcile active memberships and versioned consent evidence against the approved roster.
6. Enable learner UI only after the corresponding frontend release is ready.

The unique membership index prevents duplicate learner membership records. The unique cohort-code and invitation-token indexes are safe because their collections are new. No backfill is required for existing `LiveSession` documents. `GOOGLE_OAUTH_CLIENT_IDS` may be set to a comma-separated audience allowlist if production app builds use client IDs beyond the current app default.

## Rollback

Roll back the backend release. Existing course, enrollment, and session consumers continue operating because no existing fields changed meaning and `cohortId` is optional. Retain the new collections as recovery evidence; do not drop them during an application rollback. Do not delete Google subject values that were added to users during this release. If the release is retried, invitation acceptance and consent upserts remain idempotent.

## Verification evidence

- Authorization regression tests cover active learner, unrelated learner, assigned instructor, unassigned instructor, administrator, and unauthenticated callers.
- Missing and inaccessible cohorts return identical public errors.
- Tests cover membership access dates, duplicate membership behavior, capacity enforcement path, and audit creation for a successful mutation.
