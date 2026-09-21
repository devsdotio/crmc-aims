# Phase 02 — Architecture (detailed process)
> Pairs with `.mdrules/crmc-aims/02-architecture.md`.

## Entry criteria
- [ ] 01-planning passed — plan and acceptance criteria exist.

## Steps
1. Check for an existing pattern/module that already solves this shape of problem.
2. Define the contract: inputs, outputs, error cases, side effects.
3. If data model changes: show before/after schema, backward-compatibility, migration path.
4. Assign clear ownership per layer (UI / API / data).
5. Address performance, security, scalability explicitly — even if the answer is "not a concern here, because X."
6. Document trade-offs considered (Option A vs B, why chosen).

## Exit criteria (all must be true to pass)
- [ ] Contract is fully specified (no "TBD" on inputs/outputs/errors).
- [ ] Data model changes (if any) have a stated migration path.
- [ ] At least one alternative was considered and rejected with a reason.

## Failure conditions
- Contract doesn't actually match what planning asked for (scope mismatch discovered here).
- Chosen design can't satisfy a stated risk from planning (e.g. planning flagged
  "must handle 10k concurrent users" and this design clearly can't).
- No migration path for a breaking schema change.

## On failure
- **Scope was actually wrong/ambiguous** → cycle back to `01-planning`. Carry
  forward: the specific gap architecture exposed, in one sentence.
- **Design itself just doesn't work** (e.g. contract is internally
  inconsistent) → retry in place with the specific inconsistency named.

## Retry limit
3 attempts in place. If architecture cycles back to planning **twice** in the
same task, stop and get explicit scope confirmation from the user before continuing.
