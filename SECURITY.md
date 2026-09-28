# Security policy

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials or personal data. Use the repository's **Security → Report a vulnerability** private advisory flow. If that is unavailable, contact a repository administrator privately and include the affected component, impact, reproduction steps and any suggested mitigation.

We will acknowledge a valid report, assign an incident owner, contain active exposure, prepare a reviewed fix and communicate remediation without disclosing user data.

## Supported production surface

Security fixes target the deployed `main` branch and the services listed in [docs/PRODUCTION.md](docs/PRODUCTION.md). Historical releases are retained only for rollback and are not independently supported.

## Credential handling

- GitHub secrets and root-owned server environment files are the approved stores.
- Production database credentials must be least-privilege and separate from migration/operator identities.
- A credential exposed in chat, logs, commits or screenshots is considered compromised and must be rotated.
- Secret values must never be copied into issues, pull requests, CI logs or documentation.
