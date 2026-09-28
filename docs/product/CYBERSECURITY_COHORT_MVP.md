# Cybersecurity Basics Cohort MVP

Status: proposed for the first pilot  
Owner: TCM One founders  
Parent epic: GitHub issue #23  
Specification issue: GitHub issue #24

## Product summary

TCM One will run a two-month, instructor-led cybersecurity basics cohort for 10–25 beginner learners. The product is not a catalogue of disconnected features. It is one dependable loop:

> Onboard → know the next action → attend → practise → ask for help → receive feedback → improve.

The initial learner is a college student or early-career professional, primarily 18 or older, using an Android phone and sometimes an unreliable connection. This age assumption must be confirmed before enrollment opens. If minors are accepted, guardian consent and child-data handling become launch requirements rather than follow-up work.

## Customer problem

Beginner learners can find abundant cybersecurity content but struggle to choose a safe path, attend consistently, practise legally, recover after missing a class, and obtain timely human guidance. Instructors currently have to coordinate links, notes, recordings, attendance, exercises, feedback, and individual follow-up across unrelated tools.

TCM One should give learners one calm place that answers four questions:

1. What should I do next?
2. When is my next live class and how do I join it?
3. Where are the notes, recording, and safe practice task from the last class?
4. How do I get help, and who owns my request?

## Press release

TCM One is opening a small, two-month cybersecurity basics cohort built around live teaching and guided execution. Learners receive a clear weekly plan, Google Meet classes, class resources and recordings, safe practice challenges, progress visibility, and structured access to their instructors. The pilot deliberately serves one cohort well before TCM expands the system into additional subjects.

## Business outcome

The pilot should prove that TCM can operate a high-attention cohort repeatedly, not merely publish course content.

Primary outcome:

- At least 70% of activated learners complete the final safe capstone challenge.

Leading indicators:

- 90% of invited learners complete onboarding within 48 hours.
- 85% of learners can find and join their next class without navigation help.
- 80% weekly attendance across the cohort.
- 75% of learners submit the weekly challenge.
- 80% of completed sessions receive learner feedback within 48 hours.
- Every open help request has an owner, status, and response timestamp.

These are pilot targets, not marketing promises. They should be adjusted after baseline data from the first 10–20 learners.

## V1 capabilities

### Learner

- Accept an invitation or sign in, complete a minimal onboarding profile, and understand why each field is requested.
- See one cohort home focused on the next class, pending challenge, latest resource, and open help request.
- View the schedule in local time and join Google Meet during an allowed window.
- Access published notes, recording links, and optional captions/transcript links.
- Download lightweight notes for intermittent connectivity.
- Complete a small, legal, sandbox-oriented challenge and submit text, a link, or an allowed attachment.
- Submit a short class reflection without losing access to the next class.
- See personal progress without exposing private performance to other learners.
- Raise a help request and see its owner and status.
- Maintain a useful social-learning profile with name, photo, headline, interests/skills, learning goal, and optional public links.

### Instructor

- Manage only courses and cohorts they own or to which they are assigned.
- Create and edit cohort sessions, including Google Meet, schedule, topic, and join window.
- Publish notes and recording links after a session.
- Record attendance with a reason and audit timestamp.
- Create small challenges, review submissions, and return actionable feedback.
- View only learners assigned to their cohort.
- Triage help requests and mark them resolved or escalated.
- See aggregate feedback trends; private learner feedback is not a public rating weapon.

### Operator/admin

- Create a cohort from a course template and assign instructors.
- Invite or manually enroll learners after an external payment, scholarship, or waiver decision.
- Correct enrollment and schedule mistakes with an audit trail.
- See cohort health: activation, attendance, resource publication, challenge completion, feedback, and open support.
- Suspend access without deleting learning records.
- Export or delete a learner's data through a controlled request workflow.

## Explicit non-goals

- Public course marketplace or every future TCM vertical.
- NEET, JEE, government exam, jobs, startup, or partner workflows.
- Automated Google Meet provisioning or recording ingestion.
- Claims of 24×7 human availability.
- Public leaderboards based on sensitive learner performance.
- AI-generated cybersecurity instructions without instructor review and safety boundaries.
- Native in-app checkout before Apple/Google policy and India-specific terms are reviewed.
- Replacing the current public website with Expo.
- Migrating to Expo Router, SSR, microservices, or a new database for this launch.

## Product decisions

### One cohort, not the whole vision

The broader TCM ecosystem remains the destination. This release proves one reusable delivery unit—course template plus cohort plus sessions—before expanding into other domains.

### Live-first with recordings as recovery

Live classes remain the primary experience. Recordings support revision and legitimate absence; they do not turn the cohort into a self-paced video library.

### Feedback is encouraged, not an access ransom

The historical concept required feedback before revealing the next class link. V1 will prompt strongly and measure completion, but it will not block a paid learner from an essential class. This protects learners with accessibility, connectivity, or time constraints and avoids biased forced responses.

### Manual enrollment before complex checkout

For the pilot, payment or scholarship decisions can happen outside the app and an operator activates enrollment. This avoids mixing cohort validation with unresolved mobile-store payment rules. Payment automation is a separate product and compliance decision.

### Human guidance with bounded expectations

V1 shows support ownership and target response times. It does not promise continuous human availability. Suggested pilot target: acknowledge within four operating hours and resolve or escalate within one operating day.

## Data-domain outline

The implementation should be additive and keep existing API consumers working.

- `Course`: reusable curriculum and public description.
- `Cohort`: dated delivery of a course, capacity, status, instructors, timezone, and support policy.
- `CohortMembership`: learner/instructor membership, enrollment state, source, and access dates.
- `Session`: cohort class with schedule, topic, Meet link, join window, lifecycle, and publication state.
- `SessionResource`: note, recording, transcript, link, or attachment with visibility and publication metadata.
- `Attendance`: one learner/session fact with status, source, recorder, and timestamp.
- `Challenge`: cohort or session practice task with safety guidance, due date, and rubric.
- `Submission`: learner attempt, status, content references, and instructor feedback.
- `SessionReflection`: learner feedback tied to one membership and session.
- `HelpRequest`: learner question with owner, priority, status, and response timestamps.

All private reads and writes must derive identity from the authenticated server session. Client-supplied learner or mentor IDs are never authorization.

## Security and privacy requirements

- A learner can access only cohorts in which their active membership exists.
- An instructor can access only assigned cohorts and their learners.
- Meeting links, recordings, submissions, attendance, and private feedback require authorization.
- Admin mutations produce an audit record with actor, action, target, time, and request correlation ID.
- Attachments have type/size controls and are never executed.
- Cybersecurity exercises use authorized labs, local sandboxes, or intentionally vulnerable targets; the platform must not encourage scanning third-party systems.
- Logs and analytics must avoid recording meeting URLs, tokens, submissions, or unnecessary personal content.
- Account export/deletion is designed as one server-side workflow shared by web and native clients.

## Rollout

1. Seed a staging cohort with synthetic learners.
2. Run instructor/operator rehearsal from invitation through final feedback.
3. Pilot with 5 internal or trusted learners.
4. Correct journey blockers and support procedures.
5. Enroll 10–25 learners in the first paid or sponsored cohort.
6. Review metrics and interview at least three learners weekly.
7. Expand only after the core loop meets agreed thresholds.

## Open founder decisions

- Confirm the first cohort's learner age range and whether minors are allowed.
- Confirm class frequency, days, and target start date.
- Confirm languages used in class and in written resources.
- Confirm price, scholarship policy, refund policy, and payment collection method.
- Confirm the Google Workspace account that owns Meet links and recordings.
- Confirm the operating support hours and escalation contact.
- Confirm what “course completion” requires and what a certificate actually certifies.

