# ADR 0002: Preserve the public-site and authenticated-app boundary

Status: accepted for the first cohort  
Date: 2026-09-28

## Context

TCM One currently has two separately deployed products:

- `thecodemunk.in` from `TCM-ONE/tcm-latest`, serving the current public website.
- `app.thecodemunk.in` from this repository, serving the authenticated Expo web application alongside Android builds.

The long-term plan is for the app backend and administration model to own shared platform data while the public site remains dynamic. A suggestion proposed eventually consolidating public pages into Expo using static rendering or server rendering. The current app does not use Expo Router, public SEO pages have different performance and navigation requirements, and the first cohort does not require a frontend-framework migration.

## Decision

For the first cybersecurity cohort:

1. Keep `thecodemunk.in` as the public discovery and conversion surface.
2. Keep `app.thecodemunk.in` as the authenticated learner, instructor, and operator product.
3. Make the app backend the versioned contract for new cohort functionality.
4. Move public read-only catalogue/content slices behind that API gradually and behind explicit compatibility checks.
5. Do not migrate the public site to Expo Router, static rendering, or SSR as part of the cohort MVP.

## Why

- It minimizes launch risk and preserves the working public site.
- It lets the team improve the highest-value learner loop without an unrelated routing/SEO migration.
- It supports the existing gradual MySQL-to-Mongo/API migration decision.
- It acknowledges that public acquisition and authenticated learning have different UX, performance, and release needs.

## Consequences

Positive:

- Smaller blast radius and independent rollback.
- Public SEO and landing performance remain isolated from authenticated-app complexity.
- Existing native and web app code can evolve together where that is valuable.

Costs:

- Two frontend deployments remain operational.
- Shared catalogue contracts must be explicit to prevent drift.
- Visual tokens may need coordinated updates until a shared package is justified.

## Revisit when

- The public catalogue is fully API-owned and stable.
- The team has measured duplicated work that a shared frontend materially reduces.
- Expo's chosen rendering mode meets SEO, performance, hosting, rollback, and operational requirements in a prototype.
- A migration plan can preserve URLs, metadata, analytics, accessibility, and rollback.

## Rollback

This decision introduces no runtime change. A future consolidation decision can supersede it through a new ADR and a staged route-by-route migration.

