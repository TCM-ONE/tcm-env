# Production operations

Verified 2026-09-09 against OCI and both running servers.

| Service | Host | Runtime |
| --- | --- | --- |
| API, persistent uploads, legacy download/admin services | `tcm-backend`, `140.245.209.147`, private `10.0.0.203` | Ubuntu, Node 22, systemd, Caddy |
| Website and admin dashboard | `cynik-free-sentinel`, `140.245.249.14`, private `10.0.0.124` | Ubuntu, Caddy, atomic static releases |
| Application database | MongoDB Atlas, database `tcm_ac` | External database, not stored on either VM |

The production runtime authenticates as the dedicated `tcm_app_prod` database user with `readWrite` access limited to `tcm_ac`. The former shared `atlasAdmin` runtime user was revoked on 2026-09-23 after an overlap validation, atomic environment switch, service restart and external health check. Administrative migration work must use a separate temporary/operator identity rather than expanding the runtime account.

The hosting tenancy has one subscribed region (`ap-hyderabad-1`) and these two running E2.1.Micro instances. Both have about 1 GiB RAM and 2 GiB swap. This is a small single-backend deployment, without automatic failover. Capacity/load testing and a separate-region disaster recovery deployment are not included.

## Runtime and deployment

- API: `https://api.thecodemunk.in/api/health`; healthy production response requires HTTP 200, `ok:true` and `mongo:1`.
- Website: `https://app.thecodemunk.in`; admin: `https://admin.thecodemunk.in`.
- `/opt/tcm/backend` points to a versioned directory under `/opt/tcm/releases`.
- `/opt/tcm/.env` is root-owned, mode 0600, and loaded by systemd. Deployment never overwrites it from a potentially stale GitHub secret.
- `/etc/systemd/system/tcm-backend.service.d/production.conf` sets production mode, loopback binding, `UPLOADS_DIR=/opt/tcm/uploads` and `PUBLIC_ORIGIN=https://api.thecodemunk.in`. `PUBLIC_ORIGIN` is the API/public-file origin; learner invitation links use `TCM_APP_ORIGIN`, which defaults to `https://app.thecodemunk.in` and must be an HTTPS origin in production. Keep the two settings separate.
- Uploaded files are independent of application releases. Never rsync-delete `/opt/tcm/uploads` or put it inside a release.
- The service has a read-only filesystem except the upload directory and private temporary storage; capabilities are cleared. Caddy owns public HTTP/HTTPS. SSH is key-only; host and OCI firewalls allow SSH and web ports, not application ports.
- CI tests startup, failed writes, media recovery and the standalone dependency lockfile. Backend deployments stage/install before switching the symlink, then require database health. Failed activation restores the previous symlink.
- Roll back using `sudo bash /opt/tcm/releases/<release>/activate.sh /opt/tcm/releases/<release>` after reviewing that release and its config. Do not use an old release lacking the production fixes.
- Retain known-good releases; inspect `/opt/tcm/releases` periodically for disk usage. Do not remove the active symlink target.

Production refuses database-free startup and rejects requests while disconnected. Failed post writes return an error instead of an invented successful post. Temporary device/blob media URLs are rejected on post creation. Demo admin/partner creation and automatic seed cleanup are disabled in production. Missing/deleted users cannot authenticate via the former mock-user fallback.

## Media and backups

Disk is the primary media store. MongoDB holds optional copies of files up to 15 MiB; larger files rely on the filesystem backups. This stays below MongoDB's [16 MiB document limit](https://www.mongodb.com/docs/manual/core/gridfs/). Media recovery hydrates a real Buffer and can restore a missing disk file from an existing database copy.

- Backend `tcm-backup.timer`: daily at 02:30 UTC, with up to five minutes jitter.
- `/var/backups/tcm/daily/<UTC timestamp>` contains compressed MongoDB archive, uploads, runtime/proxy configuration and SHA256 checksums. Completed backups older than seven days are rotated after a new successful backup.
- Sentinel `tcm-backup-pull.timer`: daily at 03:30 UTC, retains copies for fourteen days under `/var/backups/tcm-backend`. A dedicated, source-restricted SSH key can only export completed backups; private keys are not committed.
- Sentinel `tcm-object-storage-backup.timer`: daily at 04:15 UTC, checksum-verifies the latest replica and copies it to the private `tcm-production-backups` OCI Object Storage bucket. Authentication uses the sentinel instance principal; the IAM policy grants create, inspect and read permissions only for that bucket. Object Storage keeps 35 days through a bucket lifecycle policy.
- The Object Storage client is pinned in `/opt/oci-cli`; identifiers live in root-owned `/etc/tcm/object-storage-backup.env` and no API key is stored on the VM. The exact sentinel instance is the sole member of the `tcm-sentinel-backup-uploaders` dynamic group. Uploads are write-once (`--no-overwrite`) and checksum-verified.
- The initial backup was copied to sentinel and all checksums verified. Its MongoDB archive was actually restored to a temporary database; 27 users and two posts were verified, then only the temporary restore database was removed.
- The first Object Storage acceptance run on 2026-09-23 uploaded and remotely verified four objects (manifest, configuration, Mongo archive and media archive), totalling 265,041,685 bytes. The health monitor now also rejects an Object Storage marker older than 30 hours.
- OCI boot-volume recovery baselines for both machines reached `AVAILABLE` on 2026-09-09. These are manual baselines, not recurring volume backup policies. Application backups above are scheduled.
- Both servers and the Object Storage bucket remain in the same OCI region/account. The object copy protects against either VPS being lost, but not loss of the entire OCI account/region. MongoDB dumps are logical backups, not a transaction-consistent point-in-time recovery service across all collections.

Check or run backups:

```bash
sudo systemctl start tcm-backup.service              # backend
sudo journalctl -u tcm-backup.service -n 30
sudo systemctl start tcm-backup-pull.service         # sentinel
sudo journalctl -u tcm-backup-pull.service -n 30
sudo systemctl start tcm-object-storage-backup.service
sudo journalctl -u tcm-object-storage-backup.service -n 30
```

Restore into a new isolated database first using `mongorestore --gzip --archive=<archive> --nsFrom='tcm_ac.*' --nsTo='<new_database>.*' --config=<root-only-uri-file>`. Compare collection counts and indexes. Never use `--drop` against the live database. For files, verify SHA256SUMS and extract into a staging directory before copying selected missing files into `/opt/tcm/uploads`. Preserve ownership `ubuntu:ubuntu`. Restore runtime secrets only after reviewing the backup's age and any subsequent credential rotations.

## Monitoring

Sentinel `tcm-health.timer` checks API/database health, rolling five-minute backend 5xx and database-unavailable signals, failed/stale outbox work, website/admin HTML and replicated-backup freshness every five minutes. Authentication failures are exposed in the health metrics for diagnosis without making expected rejected requests an outage. Failures appear in systemd and the journal:

```bash
sudo systemctl --failed
sudo journalctl -u tcm-health.service -n 30
sudo journalctl -u tcm-backend.service -n 50          # backend
```

No email, Slack or other outbound alert recipient has been configured. Health checks are not automatic incident response. Set an approved alert destination before relying on unattended operations.

## Incident findings and verification

- Latest source `db9c564` referenced `governmentRouter` without importing it; production was crash-looping with more than 2,700 restarts.
- The backend-specific lockfile was stale, breaking `npm ci` on the VM even though workspace installs succeeded locally.
- The existing 240 MiB persistent media directory was not configured in runtime; deployment deleted the backend-relative upload directory.
- Missing HTTPS public origin produced HTTP image links. Two stored documents were repaired and one missing JPEG restored from MongoDB. Two older referenced images (`mtocaq7p-6bdd1d6e8191.png` and `msvfy10o-2ea297a28b03.jpg`) had no surviving file or database copy; their dead references were cleared from the post/avatar records, and the normal frontend fallback now appears. The original visual content must be re-uploaded if it is still needed.
- A private synthetic photo post was uploaded through the live authenticated HTTPS API, checked in MongoDB, fetched byte-for-byte, and rechecked after restarting the service. Removing only that synthetic image from disk also verified database restoration. All synthetic test records/files were cleaned up.
- Default admin and partner passwords were replaced with generated credentials. Recovery values are in the ignored local `secrets/production-credentials-20260909.json`, mode 0600, and root-only incident recovery storage on the backend. They are not in GitHub or this document.
- Website Caddy routing, camera/photo permissions and cache headers were corrected. Service-worker caching excludes API and cross-origin requests, and the cache version was bumped.
- Backend releases now include the official frontend icon, so the default `/uploads/logo.png` fallback is created and backed up at startup.

The standalone backend production dependency audit reported zero advisories. The frontend build-tool audit still reports the known Metro/React Native `image-size` advisory. The [ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and [JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) advisories list no patched release. Metro is used by build tooling, not the deployed Caddy static website or standalone backend. Do not process untrusted assets through Metro; revisit when upstream publishes a compatible fix. CI now fails on backend production vulnerabilities while reporting this frontend-only unresolved advisory explicitly.

The production backend, website export and admin checks passed in GitHub Actions, as did all three deployment workflows. The separate Android bundle check still fails because the existing Expo/React Native dependency combination cannot resolve `hermes-compiler/package.json`. Native SDK alignment is a separate mobile-release task; this website/VPS repair does not bypass that check or claim a working Android release.

This incident work is not a complete application authorization audit. Media URLs are public URLs; marking a post private does not create private object storage. Review the application's privacy and authorization design separately before storing confidential media.
