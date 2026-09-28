## Linked issue

Closes #

Linked product spec or critical journey:

## Outcome

Describe the user or operational outcome, not only the files changed.

## Risk and compatibility

- Change class: <!-- docs | code | config | infrastructure | schema/data migration -->
- Backward compatible: <!-- yes/no and why -->
- Security/privacy impact:
- Dependencies or capacity assumptions:
- New dependency and why it is needed: <!-- write "none" when unchanged -->
- API/client compatibility impact: <!-- web, currently installed native versions, legacy website -->

## Verification evidence

- [ ] Repository governance audit
- [ ] Relevant tests/lint/type/build checks
- [ ] Linked acceptance criteria have executable tests or explicit manual evidence
- [ ] Dependency/security checks
- [ ] Critical journey or deployment smoke test, when applicable

Commands and results:

```text

```

## Rollout and rollback

- Rollout steps:
- Abort signals:
- Rollback steps:
- Post-deploy owner:

## Review checklist

- [ ] No secrets or personal production data are included
- [ ] Authorization and failure paths were considered
- [ ] Older supported web/native clients remain compatible or an update gate is documented
- [ ] Stateful changes are additive/reversible or explicitly gated
- [ ] Documentation/runbooks are updated
- [ ] Screenshots are attached for meaningful UI changes
