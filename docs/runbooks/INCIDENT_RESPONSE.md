# Production incident response

## First ten minutes

1. Name an incident commander and record the UTC start time.
2. Identify affected journeys: API/auth, website, admin, uploads, payments or migration.
3. Check `https://api.thecodemunk.in/api/health`, GitHub deployments and failed systemd units.
4. Stop the rollout or data-changing job. Do not retry migrations blindly.
5. If the latest release caused the incident, use the documented release rollback before debugging forward.
6. Preserve sanitized logs and evidence; never paste secrets or user data into the issue.

## Service checks

```bash
sudo systemctl --failed
sudo journalctl -u tcm-backend.service -n 100
sudo journalctl -u tcm-health.service -n 30
```

Confirm MongoDB connectivity, five-minute error signals, outbox backlog and backup freshness from the health response and sentinel. For data incidents, freeze writes and capture counts before making corrections.

## Recovery rules

- Application release: activate the last verified versioned release.
- Website/admin: repoint the `current` symlink to the previous verified release and reload Caddy.
- Database: restore only into a new isolated database, validate, then deliberately switch configuration. Never restore over the live database.
- Credential exposure: revoke/rotate with an overlap credential, validate from production, then remove the old identity.

## Closure

Verify the critical journey externally, assign every follow-up, document customer impact and update the runbook if responders lacked information. Break-glass changes require a retrospective issue and a normal reviewed PR afterward.
