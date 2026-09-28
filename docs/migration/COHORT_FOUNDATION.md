# Cohort foundation rollout and rollback

This change creates new `cohorts`, `cohortmemberships`, and `auditlogs` collections and adds an optional `cohortId` field to new `LiveSession` documents. It does not rewrite or delete existing data.

## Rollout

1. Deploy the backend while existing course and enrollment APIs remain the source of truth.
2. Verify `/api/health` and authenticated cohort authorization checks.
3. Create the pilot cohort through the audited admin API.
4. Add pilot learners idempotently and reconcile the resulting membership count against the approved roster.
5. Only after reconciliation, enable cohort UI work behind its own release path.

The unique membership index prevents duplicate learner membership records. The unique cohort-code index is safe because the collection is new. No backfill is required for existing `LiveSession` documents.

## Rollback

Roll back the backend release. Existing course, enrollment, and session consumers continue operating because no existing fields changed meaning and `cohortId` is optional. Retain the new collections as recovery evidence; do not drop them during an application rollback. If the release is retried, membership creation remains idempotent.

## Verification evidence

- Authorization regression tests cover active learner, unrelated learner, assigned instructor, unassigned instructor, administrator, and unauthenticated callers.
- Missing and inaccessible cohorts return identical public errors.
- Tests cover membership access dates, duplicate membership behavior, capacity enforcement path, and audit creation for a successful mutation.
