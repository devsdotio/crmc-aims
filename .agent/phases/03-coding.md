# Phase 03 — Coding (detailed process)
> Pairs with `.mdrules/crmc-aims/03-coding.md`.

## Entry criteria
- [ ] 02-architecture passed — contract and data model (if any) are defined.

## Steps
1. Read existing relevant files/patterns before writing new code.
2. Implement the smallest correct change that satisfies the contract from Architecture.
3. Add explicit error handling at every external boundary (API, DB, file I/O).
4. Validate inputs at boundaries.
5. Remove dead code, debug prints, commented-out blocks before calling it done.
6. Self-check the implementation against the Architecture contract line by line
   before handing off to Review.

## Exit criteria (all must be true to pass)
- [ ] Implementation matches the contract from Architecture (inputs/outputs/errors).
- [ ] No known unhandled error paths.
- [ ] No debug artifacts left in the code.

## Failure conditions
- Implementing the contract reveals it's actually impossible/inconsistent as designed.
- A specific bug: wrong output for a given input, unhandled exception, etc.
- Code technically works but silently violates a non-negotiable from `00-context.md`.

## On failure
- **Contract itself doesn't hold up when implemented** → cycle back to
  `02-architecture`. Carry forward: the exact assumption or contract clause
  that broke, with the concrete case that exposed it.
- **Simple, local bug** → retry in place with just the failing case as input.

## Retry limit
3 attempts in place per bug/issue. If the same bug survives 3 attempts, that's
itself a signal the root cause is one level up (Architecture) — cycle back
instead of trying a 4th patch.
