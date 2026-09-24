# CI/CD and hosting

See [Production operations](PRODUCTION.md) for verified host inventory, persistence, backups, monitoring, recovery and incident findings.

- **CI Checks**: backend startup/persistence regression tests, standalone backend clean install, development health smoke test, Expo Android/web bundle exports, admin build, informational dependency audit.
- **Deploy Backend to OCI VM**: changes to backend/deployment files on `main` stage a new release on `140.245.209.147`. Tests and dependency installation run before activation. The service must report a connected MongoDB; failed activation restores the previous release. Source synchronization excludes secrets, dependencies and uploads. Runtime secrets stay in `/opt/tcm/.env`.
- **Deploy Expo Web to Cyber Sentinel**: builds the Expo web app on the runner and publishes a versioned static release on `140.245.249.14`. Caddy configuration is validated before reload.
- **Deploy Admin to Cyber Sentinel**: builds and publishes the admin dashboard to the same web server.
- **Deploy dl-server**: provisions the one-time download service on the backend host and verifies a generated link end to end.
- **Android releases and OTA updates**: manual workflows or version-tag pushes; ordinary web/backend pushes do not publish native releases.

The `tcm-backend`, `app-thecodemunk-in`, and `admin-thecodemunk-in` environments accept deployments only from `main`. One of the two founders must approve each job, the initiator cannot approve their own deployment, and administrators cannot bypass the gate. The workflow job declares its environment before it can read deployment secrets or open SSH connections; GitHub's native environment deployment is the audit record.

Environment variables `BACKEND_HOST`, `BACKEND_USER`, `SENTINEL_HOST`, and `SENTINEL_USER` select deployment targets. Environment secrets `OCI_SSH_KEY` and `SSH_KNOWN_HOSTS` provide authentication and the independently verified ED25519 host-key pin. Every deployment uses `StrictHostKeyChecking=yes`; a missing or changed key fails before upload. `TCM_API_URL` supplies the native API URL. Web builds use `https://api.thecodemunk.in/api`.

The old `TCM_BACKEND_ENV` provisioning flow is intentionally removed: it could overwrite corrected runtime configuration with stale values. Edit the protected VM environment file when an intentional configuration change is needed, validate it, and restart the service. Never print environment files into workflow logs.
