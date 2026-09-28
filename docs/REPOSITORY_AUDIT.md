# Repository and platform operating-system audit

- Audit date: 2026-09-24
- Scope: `Cuboidsoft-official/tcm-env`, `ayushman-it/tcm`, GitHub delivery controls, OCI/Hostinger deployment, Atlas, backups and operational ownership
- Recommendation: **NO-GO for the MySQL-to-API production cutover; continue staged remediation.**

## Overall summary

The deployed API and static applications now have rollback-safe releases, health checks, least-privilege Atlas runtime access and verified multi-copy logical backups. The engineering operating system is not yet mature enough for an irreversible cross-database cutover: repository governance is absent, deployments are not approval-gated, alert delivery is not configured, the Hostinger repository cannot be administered by the current platform account, and final data/auth/media cutover evidence is incomplete.

## Strong areas

- Backend releases are versioned and activation has a rollback path.
- Production fails closed when MongoDB or critical writes are unavailable.
- Daily database/media/config backups are checksum-verified across backend, sentinel and private Object Storage.
- Atlas runtime access is limited to `readWrite@tcm_ac`; operator access is separate.
- Migration tooling supports dry-run/merge validation and prevents accidental production execution.
- CI exercises backend persistence behavior, frontend exports, admin builds and dependency audits.

## Findings

| Severity | Area | Evidence | Required action |
| --- | --- | --- | --- |
| Critical | Merge governance | `main` has no protection/ruleset; production deploys on pushes to `main` | Require PR, independent review, resolved conversations and stable required checks |
| Critical | Website cutover | PHP website still owns MySQL reads/writes; final delta and auth smoke are incomplete | Follow ADR 0001 and migrate route-by-route through the API behind a reversible flag |
| Critical | Exposed provider credentials | Secret scanning found four publicly leaked Google/Groq/OpenRouter alerts; current code reconstructs provider keys and client builds can embed them | Revoke provider keys, remove literals and proxy AI through authenticated backend APIs (issue #6) |
| High | Repository security | Secret scanning, push protection and Dependabot security updates are disabled | Enable controls and triage any historical alerts before cutover |
| High | Actions supply chain | Repository allows all Actions and workflows reference mutable tags | Pin reviewed Actions to full SHAs and restrict allowed Actions |
| High | Deployment trust | OCI workflows use SSH `accept-new`; repo secrets are not environment-scoped | Pin host keys, use protected environments and scope production credentials |
| High | Alerting | Health failures only appear in systemd/journal | Configure an approved outbound recipient with delivery testing and ownership |
| High | Disaster recovery | All automated copies remain in one OCI account/region; Atlas M0 has no PITR | Add independent-region/account backup and run pre-cutover restore drill |
| High | Website administration | Current collaborator has push but not admin; Hostinger deploy secrets/variable/environment are absent | Repository owner grants admin or transfers repo into the organization |
| Medium | Repo hygiene | Local logs, IDE state and account screenshots were tracked; governance templates were absent | Remove artifacts, prevent recurrence and enforce the repo audit in CI |
| Medium | Deployment drift | VPS hardening and Caddy changes are imperative workflows; some services run as root | Move durable configuration into reviewed files/IaC and least-privilege units |
| Medium | Native release | Android has a documented Hermes build failure; iOS release credentials are not inventoried | Establish reproducible signed release acceptance before claiming mobile readiness |
| Decision | Licensing | Public repositories have no declared license | Founders/legal owner choose proprietary or an open-source license; do not infer one |

## Highest-leverage sequence

1. Merge the governance bootstrap PR and enable protected `main` plus stable required checks.
2. Harden Actions, production environments, SSH trust and secret scope in small reviewed PRs.
3. Grant platform administration on the website repo and implement its API migration plan through contract-tested increments.
4. Configure outbound alerts and independent disaster-recovery storage.
5. Complete final-clone auth/media/user-journey evidence, name cutover roles and execute the cutover runbook.

Every item must have an issue, owner, acceptance evidence and rollback. GitHub settings changes that cannot be represented in a PR are recorded on the governing issue with before/after API evidence.
