# Service ownership

| Area | Primary | Secondary | Production surface |
| --- | --- | --- | --- |
| Platform, OCI, Hostinger, GitHub and CI/CD | Nikhil (`@5h4d0wn1k`) | Ayushman (`@ayushman-it`) | API, app/admin hosting, deployment and recovery |
| Product direction, courses and acceptance | Ayushman (`@ayushman-it`) | Nikhil (`@5h4d0wn1k`) | Learner, mentor, partner and website journeys |
| Database migration/cutover | Named change-window commander | Platform owner | MySQL source, Atlas target, reconciliation and rollback |

No production data migration starts until the issue names the cutover commander, Hostinger owner, OCI owner and product acceptance owner. If a primary is unavailable, the secondary may contain or roll back an incident but must not improvise an irreversible migration.

Service inventory, recovery commands and known residual risks live in [PRODUCTION.md](PRODUCTION.md). Incident response is in [runbooks/INCIDENT_RESPONSE.md](runbooks/INCIDENT_RESPONSE.md).
