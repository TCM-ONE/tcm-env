#!/usr/bin/env python3
"""Small dependency-free governance audit used locally and in CI."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
REQUIRED = [
    "README.md", "CONTRIBUTING.md", "SECURITY.md", "SUPPORT.md", "CODE_OF_CONDUCT.md",
    ".github/CODEOWNERS", ".github/pull_request_template.md", ".github/dependabot.yml",
    ".github/ISSUE_TEMPLATE/bug.yml", ".github/ISSUE_TEMPLATE/change.yml",
    "docs/OWNERSHIP.md", "docs/PRODUCTION.md", "docs/CI-CD.md", "docs/REPOSITORY_AUDIT.md",
    "docs/runbooks/INCIDENT_RESPONSE.md", "docs/adr/0001-api-owned-persistence.md",
]

failures = []
for relative in REQUIRED:
    if not (ROOT / relative).is_file():
        failures.append(f"missing required mechanism: {relative}")

tracked = subprocess.run(
    ["git", "ls-files"], cwd=ROOT, check=True, text=True, capture_output=True
).stdout.splitlines()
for path in tracked:
    if "/.idea/" in f"/{path}" or path.endswith(".log") or (path.startswith("codex-") and path.endswith(".png")):
        failures.append(f"tracked local/generated artifact: {path}")
    name = Path(path).name
    if name == ".env" or (name.startswith(".env.") and name != ".env.example"):
        failures.append(f"tracked environment file: {path}")

ci = (ROOT / ".github/workflows/ci-checks.yml").read_text()
if "pull_request:" not in ci:
    failures.append("CI does not run for pull requests")

deployments = list((ROOT / ".github/workflows").glob("deploy-*.yml"))
for workflow in deployments:
    content = workflow.read_text()
    if "branches: [main]" not in content and "tags:" not in content:
        failures.append(f"deployment trigger is not restricted: {workflow.relative_to(ROOT)}")
    if "concurrency:" not in content:
        failures.append(f"deployment has no concurrency policy: {workflow.relative_to(ROOT)}")

if failures:
    print("Repository operating-system audit: FAIL")
    for failure in failures:
        print(f"- {failure}")
    sys.exit(1)

print(f"Repository operating-system audit: PASS ({len(REQUIRED)} mechanisms, {len(tracked)} tracked files)")
