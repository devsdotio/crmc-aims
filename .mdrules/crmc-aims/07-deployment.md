# 07 — Deployment / Release

> Load when the prompt is about shipping, releasing, CI/CD, or rollback.

## Goal

Ship changes the way a team with an actual incident history would — biased
toward reversibility, visibility, and a plan for when (not if) something
goes wrong — not just "run the deploy command."

## Definition of Ready (check before deployment starts)

- [ ] Documentation (`06-documentation.md`) is done — including a rollback
      story that's specific, not just "redeploy previous version."
- [ ] Testing (`05-testing.md`) passed on the full suite, and Review
      (`04-review.md`) reached ✅ Approve or ✅🟡 Approve with follow-ups.
- [ ] Any observability hooks from Architecture are actually in place —
      you need signal to know if the deploy worked, not just that it ran.

## Process

1. **Pre-flight checklist** before any release step is suggested as "ready":
   - All tests passing (not just the new ones — full suite)
   - No secrets/env values hardcoded or committed
   - Migrations (if any) are backward-compatible, or a rollback plan exists
   - Feature flag or gradual rollout considered for risky changes
   - Monitoring/alerting is in place for what this change could break

2. **Choose a release strategy proportional to risk**, not always
   all-at-once:
   - Low-risk, well-tested change → standard deploy
   - Medium risk → feature flag, off by default, enabled after deploy
   - High risk / high blast radius → canary or gradual rollout (small % of
     traffic/users first), with a defined promotion criteria before going wider

3. **Environment awareness.** Never suggest a command or config change
   without confirming which environment it targets (local/staging/production).
   Confirm environment-specific config (env vars, feature flag state) is
   actually correct for that environment before executing.

4. **Sequencing and coordination.** If this deploy has dependencies —
   migration must run before new code, another service must deploy first —
   state the order explicitly. Out-of-order deploys are a common
   self-inflicted outage.

5. **Rollback plan first.** Before describing how to ship something, state
   how to undo it if it goes wrong — specifically:
   - Can the code simply be redeployed to the previous version? (usually yes)
   - Can the data/schema change be undone, or only rolled forward? (schema
     changes are often one-way — say so explicitly if so)
   - What's the blast radius while rollback is in progress?

6. **Communication.** Note who should know this is happening — especially
   for anything customer-facing, anything during business hours affecting
   shared infra, or anything with a non-trivial rollback story.

7. **Irreversible actions** (prod DB migrations, deleting data,
   force-pushing shared branches) require explicit user confirmation — the
   agent should never execute these autonomously, only draft the steps/commands.

8. **Post-deploy verification.** Define concrete checks — not "seems fine,"
   but a specific metric, log line, or manual check that confirms this
   actually works in the target environment, tied to what Architecture said
   should be observable.

9. **Have a defined "stop and roll back" trigger**, decided _before_
   deploying — e.g. "error rate above X% for Y minutes" — so the decision to
   roll back isn't made under pressure with no prior bar to check against.

## Output format

```
## Pre-flight checklist
- [ ] ...

## Release strategy
Standard / Feature-flagged / Canary — why, and promotion criteria if gradual.

## Sequencing
Step order and any cross-service/migration dependencies.

## Deploy steps
1. ...

## Rollback plan
If X fails, do Y. Reversible: yes/no — details if not.

## Stop-and-rollback trigger
Concrete condition that means "roll back now."

## Post-deploy verification
What to check to confirm it actually worked.

## Communication
Who should know, and when.
```

## Anti-patterns to avoid

- Treating "tests pass locally" as equivalent to "safe to deploy."
- Skipping rollback planning for "small" changes — small changes cause plenty of outages.
- Bundling unrelated changes into one release, making rollback ambiguous.
- Deploying without a pre-agreed rollback trigger, leaving that decision to
  be made in a panic mid-incident.
- Treating all changes as equally safe to ship all-at-once regardless of blast radius.
- Executing an irreversible action autonomously because "it seemed like what the user wanted."
