# Product Research Notes

Research date: 2026-09-28

## Evidence classification

### Current founder decisions

- TCM One's mission is broader than courses, but the immediate release is a two-month cybersecurity basics course.
- The first product must support student onboarding, social profiles, course/class management, notes, recorded sessions, fun challenges, and student feedback.
- Live classes use Google Meet.
- Product clarity, ease of use, real learner adoption, and feedback matter more than adding the largest feature count.
- `thecodemunk.in` remains the public site while `app.thecodemunk.in` becomes the main authenticated product.

### Shared-chat insights retained

The shared “Vision aur Business Strategy” conversation contains 1,354 messages and several branched or repeated sections. Repeated useful themes were:

- Small batches of about 25 learners and attention to individual confusion.
- Live-first learning with revision/recovery resources.
- Short post-class reflections about understanding, participation, and unanswered questions.
- Instructor feedback, doubt groups, polls, and mentor escalation.
- Course, session, attendance, notes, recordings, challenges, learner progress, notifications, and operator visibility.
- Affordable access and avoidance of unrealistic placement or support promises.
- An engaging social layer, while keeping the learning journey easy to find.

Historical ideas are not automatically requirements. For example, the conversation both requested recordings and later explored removing them; the current founder request for recorded sessions resolves that conflict. The conversation also proposed blocking the next class until feedback was submitted; the MVP keeps feedback prominent but does not block essential paid access.

Source: https://chatgpt.com/share/6a885114-bb80-83e8-9b9e-5adb0dd2b190

### Confirmed repository facts

- The frontend is Expo/React Native and exports to Android and web; it does not currently use Expo Router.
- The admin dashboard is a separate Vite/React application.
- The backend is an Express/Mongoose modular monolith.
- Existing models include users, mentors, courses, enrollments, live sessions, learning progress, class reviews, doubt rooms, notifications, programs, and events.
- Existing screens cover discovery, course detail, continuing learning, mentor dashboard, profiles, chat/doubts, community, and admin management.
- Significant parts are prototype-shaped: demo defaults, mixed identifier types, oversized screen/route files, and learning data spread across multiple representations.
- CI, required checks, CODEOWNERS, production environments, strict SSH host trust, health checks, and immutable server releases are active.

### Assumptions to validate with learners

- First learners are mostly 18+ college students or early-career beginners.
- Android phone is the primary learner surface; mentor/admin work is easier on desktop.
- Learners can use Google Meet and have enough data for live video, with recordings/notes as recovery.
- A simple “next action” cohort home is more valuable than exposing all platform features.
- Manual enrollment is acceptable for the first cohort.
- Hindi/Hinglish may be preferred for live explanation while technical terms and resources may remain English.

## Independent technical references

These sources support constraints, not automatic implementation choices:

- Expo monorepo guidance: https://docs.expo.dev/guides/monorepos/
- Expo environment-variable warning (public variables are included in client bundles): https://docs.expo.dev/guides/environment-variables/
- Expo static web rendering applies to Expo Router; the current app does not use it: https://docs.expo.dev/router/web/static-rendering/
- Microsoft Strangler Fig pattern for gradual legacy replacement: https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig
- OWASP Top 10:2025, especially broken access control and software supply-chain failures: https://owasp.org/Top10/2025/
- MongoDB Atlas backup documentation: https://www.mongodb.com/docs/atlas/backup/cloud-backup/overview/
- Apple account-deletion requirement: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Google Play account-deletion requirement: https://support.google.com/googleplay/android-developer/answer/13327111
- DORA State of AI-assisted Software Development 2025: https://dora.dev/research/2025/dora-report/
- Anthropic Claude Code best practices: https://www.anthropic.com/engineering/claude-code-best-practices

## Decisions not yet justified

- Migrating to Expo Router or server rendering.
- Moving public discovery pages into the Expo app.
- Introducing EAS Workflows in place of the functioning GitHub delivery pipelines.
- Extracting shared packages before an actual duplicated contract demands it.
- Self-hosting MongoDB instead of Atlas.
- Building in-app checkout before store/compliance review.

Each requires a separate decision record with current facts, migration cost, rollback, and owner.

## Weekly discovery script

Interview at least three pilot learners each week using recent behavior rather than hypothetical feature requests:

1. Tell us about the last time you tried to learn cybersecurity. Where did you stop?
2. Show us how you found the next class or task this week.
3. What happened the last time you missed a live class?
4. Tell us about the last question you could not get answered.
5. Which notification or reminder helped, and which was noise?
6. What did you do outside TCM to complete this week's task?
7. If you could remove one confusing step, which one would it be?

Record the observed problem, frequency, severity, workaround, and whether it blocks the pilot outcome. Do not convert every suggestion directly into a feature.

