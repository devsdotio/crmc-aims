# Phase 04 — Review (detailed process)
> Pairs with `.mdrules/crmc-aims/04-review.md`.

## Entry criteria
- [ ] 03-coding passed — implementation is complete with no known unhandled paths.

## Steps
1. Check correctness first — trace real input, edge case, failure case.
2. Check security — injection, authz, secrets, unvalidated input reaching sensitive sinks.
3. Check error handling completeness.
4. Check consistency against `00-context.md` conventions.
5. Check readability.
6. Note style-only nits last, clearly labeled optional.
7. Classify every finding 🔴/🟡/🟢 per `.mdrules/<project>/04-review.md`.

## Exit criteria (all must be true to pass)
- [ ] Zero 🔴 blocker findings remain.
- [ ] Every 🟡 finding has been acknowledged (fixed or explicitly deferred with reason).

## Failure conditions
- Any 🔴 blocker present.
- A finding that isn't really a code bug but a design gap (the code correctly
  implements a contract that itself is wrong).

## On failure
- **🔴 blocker, code-level** → cycle back to `03-coding`. Carry forward: the
  specific blocker list only — not a full re-review.
- **Finding reveals a design gap** → cycle back to `02-architecture`. Carry
  forward: what the design missed, stated as a concrete case.

## Retry limit
3 review cycles. If the same category of blocker keeps appearing across 3
cycles, stop and flag to the user that this may need a different approach
rather than another patch.
