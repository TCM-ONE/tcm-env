# Cohort API contract (v1)

Status: additive foundation for the first TCM cybersecurity cohort.

Base path: `/api/cohorts`

All endpoints require a bearer token. Error bodies use stable `code` and `message` fields. A cohort that is absent or inaccessible returns the same `404 COHORT_NOT_FOUND` response so callers cannot discover private cohorts.

## Access model

- Learner: an `active` or `completed` learner membership whose access window currently permits access, for a cohort in `enrolling`, `active`, or `completed` lifecycle state.
- Instructor: a `mentor` or `partner` explicitly present in `Cohort.instructorIds`.
- Administrator: a user whose server-side role is `admin`.
- Client-side roles or route visibility never grant access.

## Learner and instructor reads

### `GET /mine`

Returns at most 100 cohorts available to the current user. Each result includes `accessKind`. A learner result may include only that learner's membership; it never contains the cohort roster.

### `GET /:cohortId/home`

Returns the cohort, the caller's access kind, the caller's own membership when applicable, and up to 100 scheduled sessions. Meeting and recording links are returned only after the cohort access check succeeds.

## Administrator mutations

### `POST /`

Creates a cohort. Required fields are `courseId`, `code`, `title`, `capacity`, `startsAt`, and `endsAt`. Instructor identifiers must refer to eligible users. The course must exist. Codes are unique and normalized to uppercase.

### `POST /:cohortId/memberships`

Adds a learner membership. Required field: `userId`. Optional fields: `status` (`invited` or `active`), `enrollmentSource`, `accessStartsAt`, and `accessEndsAt`.

The operation is idempotent for the tuple `(cohortId, userId, learner)`: an existing membership is returned with `created: false`. Capacity includes invited, active, and paused memberships.

### `PATCH /:cohortId/memberships/:membershipId`

Changes membership status to `active`, `paused`, `completed`, or `revoked`.

All mutations require an administrator and produce an audit record containing the actor, action, target, outcome, request metadata, and non-secret identifiers. An audit intent must be persisted before the domain mutation starts.

## Compatibility policy

This contract is additive. Existing `Course`, `Enrollment`, and course-based `LiveSession` records remain valid. `LiveSession.cohortId` is optional so old clients and old records continue to work. Future clients must tolerate additive response fields.
