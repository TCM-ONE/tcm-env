# Contributing to TCM One

Production changes use an issue → branch → pull request → review → merge workflow.

## Change workflow

1. Open or select an issue with the problem, acceptance criteria, risk and owner.
2. Create a short-lived branch named `feat/<issue>-...`, `fix/<issue>-...`, `chore/<issue>-...` or `ops/<issue>-...`.
3. Keep the change focused. Do not mix migrations, infrastructure and unrelated product work.
4. Run the checks documented below and include exact evidence in the pull request.
5. Request review from CODEOWNERS. The latest pusher cannot be the only approver.
6. Merge only after required checks pass and conversations are resolved. Prefer squash merge.
7. Verify production when the merge triggers a deployment; record rollback or follow-up in the issue.

Direct pushes to `main` are reserved for a documented break-glass incident. The incident owner must open a retrospective issue and restore normal protections immediately afterward.

## Local verification

```bash
python3 .codex/scripts/repo_operating_system_audit.py
node --test backend/test/production.test.js
npm run build --prefix admin-dashboard
npm audit --omit=dev --workspace=backend
```

Run frontend exports when frontend code or shared dependencies change. Migration changes must also run the dry-run, validation and baseline comparison described in [docs/migration/README.md](docs/migration/README.md).

## Production safety

- Never commit credentials, `.env` files, dumps, private keys or production user data.
- Use additive, reversible database changes and state the rollback path.
- Never deploy a data migration directly into the current production database.
- Do not make the website connect directly to MongoDB. Database access belongs behind the TCM API.
- Never weaken checks or authorization simply to make a deployment pass.
