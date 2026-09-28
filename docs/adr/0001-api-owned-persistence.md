# ADR 0001: TCM API owns application persistence

- Status: Accepted
- Date: 2026-09-24
- Decision owners: TCM founders and platform owner

## Context

`thecodemunk.in` currently runs a PHP/MySQL application while `app.thecodemunk.in` uses the Node/MongoDB TCM platform. Maintaining two writable systems splits identity, business rules, admin operations and reporting.

## Requirements

- One authoritative identity and business-data model.
- Authorization and financial rules cannot be bypassed by another frontend.
- Website migration must be incremental and reversible.
- The landing website remains dynamic without owning a second database.
- Database credentials must not be distributed to browser or website code.

## Options considered

1. Keep MySQL and periodically synchronize both directions. This creates conflict resolution, delayed consistency and two sources of truth.
2. Connect PHP directly to MongoDB. This duplicates authorization and schema logic and expands credential exposure.
3. Make the website a client of the TCM API. This centralizes persistence and policy while allowing an incremental route-by-route migration.

## Decision

Choose option 3. `api.thecodemunk.in` owns MongoDB access. The website uses public or authenticated versioned API contracts through a server-side client where privileged credentials are required. It never receives a direct MongoDB credential.

## Rollout and rollback

Move public reads first, then identity-linked reads, then idempotent writes and admin workflows. Gate API mode with configuration, run final MySQL delta reconciliation under a write freeze, and keep MySQL read-only during the rollback window. Rollback restores the previous website release and MySQL mode; no destructive MySQL decommission occurs in the cutover change.

Re-evaluate only if service boundaries, compliance needs or scale make a separately owned website backend necessary.
