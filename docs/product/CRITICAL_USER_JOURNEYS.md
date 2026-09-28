# First Cohort Critical User Journeys

This document describes customer-visible workflows for the cybersecurity basics pilot. Component names are deliberately secondary to outcomes.

## Journey inventory

| Priority | Journey | Primary surface | Completion condition |
|---|---|---|---|
| P0 | Invitation and onboarding | Phone | Learner reaches the correct cohort home and sees a next action |
| P0 | Join a live class | Phone | Authorized learner opens the correct Meet link during the join window |
| P0 | Instructor schedules and completes class | Desktop/web | Session is scheduled, delivered, attendance recorded, and resources published |
| P0 | Recover after an absence | Phone | Learner sees recording/notes, completes recovery action, and rejoins the plan |
| P0 | Complete a challenge | Phone or desktop | Submission is safely stored and visible to the assigned instructor |
| P0 | Ask for help | Phone | Request has an owner, visible status, and response |
| P1 | Give and use class feedback | Phone and desktop | Reflection is stored and aggregate trend reaches the instructor/operator |
| P1 | Operate cohort health | Desktop/web | Operator can find and act on learners or sessions needing attention |

## Detailed P0 journey: invitation to first completed class

### Trigger

An operator has verified eligibility/payment/scholarship and sends a single-use cohort invitation.

### Learner-visible flow

1. Open invitation on phone.
2. Sign in or create an account.
3. See the cohort name, instructor, duration, expected weekly effort, support hours, privacy summary, and price/payment state before accepting.
4. Complete only required onboarding fields: preferred name, timezone, language, learning goal, experience level, and communication preference.
5. Accept cohort terms and community/safe-lab rules.
6. Land on cohort home.
7. See exactly one primary next action and a short readiness checklist.
8. Receive a reminder before the first session.
9. Open session details and join Google Meet during the allowed window.
10. After class, see attendance status, notes/recording publication state, challenge, and reflection prompt.
11. Submit the first challenge or mark a recovery plan.

### Completion condition

The learner attended or completed the recovery path, can access the first session resources, and has a visible next action.

### Failure-sensitive points

| Failure | Product response | Human response | Signal |
|---|---|---|---|
| Invitation expired or already used | Explain state; allow resend request | Operator verifies identity and resends | Invite failure rate |
| Existing email conflicts with invite | Sign in and attach invitation safely | Operator resolves mismatched identity | Identity-link failures |
| Onboarding interrupted | Save each step and resume | None unless learner requests help | Onboarding completion/time |
| Weak connection | Text-first shell, retry, cached schedule | Share fallback joining instructions | API/network errors |
| Meet link missing | Never show a dead primary action; show “being prepared” plus support | Instructor/operator publishes or communicates fallback | Missing-link alert |
| Meet unavailable | Show approved fallback/status notice | Instructor posts replacement or reschedule | Join failures and incident |
| Learner absent | Mark absent without shame; create recovery action | Mentor checks in according to policy | Consecutive absence signal |
| Recording delayed | Show publication status and expected time | Instructor uploads or explains exception | Resource SLA breach |
| Challenge upload fails | Preserve draft locally where practical; retry idempotently | Support accepts controlled fallback | Submission errors |
| Mentor no-show | Show reschedule notice and support path | Operator invokes incident/refund policy | Session incident |

## Instructor journey

1. Open instructor workspace on desktop/web.
2. Select an assigned cohort; no unrelated learner data is visible.
3. Review the next session checklist and learners needing follow-up.
4. Add or update topic, schedule, Meet link, and join window.
5. Publish the session; enrolled learners receive an in-app notification.
6. Deliver class in Google Meet.
7. Record attendance with present/late/absent/excused states.
8. Publish notes and recording/transcript links or mark why unavailable.
9. Publish a small challenge with a safe target and clear rubric.
10. Review submissions and unresolved help requests.
11. Review aggregate class feedback and record an improvement action.

Completion condition: the session is operationally closed—attendance, resources, challenge, feedback view, and follow-ups are accounted for.

## Operator journey

1. Create a cohort from an approved course template.
2. Assign Nikhil and/or Ayushman with explicit roles.
3. Set capacity, dates, timezone, support policy, and enrollment state.
4. Invite learners or activate manual enrollments.
5. Monitor activation before the first session.
6. Monitor each session for link readiness, attendance, resource publication, and unresolved help.
7. Correct mistakes through audited admin actions.
8. Handle withdrawal, refund escalation, suspension, export, or deletion requests.
9. Close the cohort and generate an outcome report.

## Feedback design

The post-class reflection should take under 45 seconds:

- I understood today's main idea: not yet / partly / yes.
- I had a fair chance to participate: no / partly / yes.
- My questions were addressed: no / partly / yes / I did not ask.
- What should the instructor revisit? Optional short text.
- Do you need follow-up? yes/no.

Instructor feedback on learners should be factual and private: attendance, challenge status, observed blocker, recommended next action. Avoid public star ratings of learners or unstructured labels such as “weak.”

## Accessibility and low-bandwidth rules

- No essential information exists only in an image, color, audio, push notification, or recording.
- Controls have labels, adequate touch targets, contrast, keyboard focus on web, and screen-reader semantics.
- Dates show the learner's timezone and an absolute date.
- Notes are downloadable; recordings show duration and do not autoplay.
- A transcript/caption link is supported when available.
- Failed form submissions preserve entered data and are safe to retry.
- Push permission is requested only after explaining its class-reminder value.

## Initial SLO candidates

- Cohort home and session details: 99.5% successful requests during the pilot.
- P95 API response for cohort/session reads: under 750 ms from the server, excluding the learner's network.
- Session join link: published at least 15 minutes before class.
- Notes/recording publication status: updated within 24 hours after class.
- Help request acknowledgement: within four operating hours.
- Restore objective for cohort records: documented and tested before public scale-up.

These are operating targets for learning, not contractual promises.

## Instrumentation

Record events with stable IDs and minimal personal data:

- invitation_opened, onboarding_completed
- cohort_home_viewed, next_action_opened
- session_join_requested, session_join_opened, session_join_failed
- resource_viewed, resource_downloaded
- challenge_started, submission_created, submission_reviewed
- reflection_submitted, follow_up_requested
- help_request_created, assigned, first_response, resolved

Metrics must be cohort aggregates by default. Access to individual learner activity follows the same membership and role rules as the product.

