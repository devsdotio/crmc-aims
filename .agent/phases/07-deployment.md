# Phase 07 — Deployment (detailed process)
> Pairs with `.mdrules/crmc-aims/07-deployment.md`.

## Entry criteria
- [ ] 06-documentation passed.

## Steps
1. Run the pre-flight checklist: full test suite green, no hardcoded secrets,
   migrations backward-compatible or rollback-ready, rollout strategy considered.
2. Confirm target environment explicitly (local/staging/production).
3. Write the rollback plan BEFORE the deploy steps.
4. For irreversible actions (prod migrations, data deletion, force-push to
   shared branches): draft the steps but require explicit user confirmation
   before treating them as executed.
5. Define post-deploy verification steps.

## Exit criteria (all must be true to pass)
- [ ] Pre-flight checklist fully green.
- [ ] Rollback plan exists and is specific (not "redeploy previous version" with no detail).
- [ ] Post-deploy verification steps are defined.

## Failure conditions
- Any pre-flight check fails (red tests, hardcoded secret found, unsafe migration).
- No viable rollback plan can be written for the change as designed.

## On failure
- **Tests red** → cycle back to `05-testing`. Carry forward: which check failed.
- **Migration unsafe / no rollback possible** → cycle back to
  `02-architecture`. Carry forward: the specific migration/rollback issue.

## Retry limit
2 attempts. Deployment-phase failures usually trace to an earlier phase's
oversight — don't keep re-attempting the deploy itself more than twice.
