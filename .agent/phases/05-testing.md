# Phase 05 — Testing (detailed process)
> Pairs with `.mdrules/crmc-aims/05-testing.md`.

## Entry criteria
- [ ] 04-review passed — no blocker findings remain.

## Steps
1. Write/verify happy-path tests.
2. Write/verify boundary-value tests (empty, zero, max, null).
3. Write/verify invalid-input tests.
4. Write/verify dependency-failure tests (DB down, API timeout).
5. Write/verify permission/auth tests if applicable.
6. Run the full suite, not just new tests — confirm nothing else broke.

## Exit criteria (all must be true to pass)
- [ ] All five test categories above are covered where applicable.
- [ ] Full suite passes, not just new tests.
- [ ] No skipped/pending tests hiding a real gap.

## Failure conditions
- A specific test case fails — implementation bug.
- A test case that reveals the design fundamentally can't support a required
  scenario (e.g. concurrency requirement from planning can't be met as architected).

## On failure
- **Implementation bug, design is fine** → cycle back to `03-coding`. Carry
  forward: the specific failing test case (input, expected, actual).
- **Design can't support the case** → cycle back to `02-architecture`. Carry
  forward: what the design needs to account for, described as a scenario.

## Retry limit
3 cycles back to coding for the same test. If it still fails, that's a strong
signal to escalate to architecture review rather than attempt #4.
