# 05 — Testing

> Load when the prompt asks to write tests, check coverage, or verify edge cases.

## Goal

Produce a test suite that would actually catch a regression before it ships —
not just tests that exist, but tests that would fail if the behavior broke.

## Definition of Ready (check before testing starts)

- [ ] Review (`04-review.md`) reached a decision — testing against
      unreviewed/unapproved code risks testing something about to change.
- [ ] If Review flagged missing coverage on specific risky logic, that's the
      priority starting point here, not an afterthought.
- [ ] The contract from Architecture (inputs/outputs/errors/idempotency) is
      available — tests should verify the contract, not just current behavior.

## Process

1. **Test behavior, not implementation.** Tests should survive a refactor
   that doesn't change external behavior. Assert on outputs, state changes,
   and calls to external boundaries — not on private internals.

2. **Pick the right level for each behavior** (test pyramid — don't default
   everything to one type):
   - **Unit tests:** pure logic, single function/component, fast, most of the volume
   - **Integration tests:** the piece talking to a real (or realistic) DB/API/queue
   - **End-to-end tests:** sparingly, for critical user-facing flows only
     Over-relying on E2E tests for everything makes the suite slow and brittle;
     over-relying on unit tests alone can miss integration bugs.

3. **Cover these categories for every function/endpoint being tested,**
   prioritized by what Review or Architecture flagged as risky:
   - Happy path (typical valid input)
   - Boundary values (empty, zero, max length, null/undefined)
   - Invalid input (wrong type, malformed, missing required field)
   - Failure of dependencies (DB down, API timeout, third-party error) —
     verify it matches the timeout/retry/fallback behavior Architecture specified
   - Permission/auth cases if applicable (unauthorized, wrong role)
   - **Contract conformance:** error taxonomy matches what was specified
     (client vs server errors), idempotency holds if claimed

4. **If fixing a bug, write the regression test first.** It should fail
   against the old code and pass against the fix — proves the test would
   actually have caught this bug, not just that it passes now.

5. **One assertion focus per test.** Name tests so the failure message alone
   tells you what broke: `should return 401 when token is expired`, not `test1`.

6. **Mock external boundaries only** (network, DB, filesystem, time) — don't
   mock the thing you're actually testing. Keep test data realistic enough
   that a mock's shape won't drift silently from the real dependency's shape.

7. **Guard against flaky tests.** No unguarded reliance on real wall-clock
   time, network calls, or test-order dependency. If a test needs
   time-sensitive behavior, control time explicitly (fake timers/clock injection).

8. **Coverage targets are risk-based, not a flat percentage.** Business-critical
   or high-risk logic (auth, payments, data mutation) should be covered more
   thoroughly than low-risk display logic — chasing a flat coverage number
   incentivizes testing the easy stuff and skipping the hard stuff.

9. **Flag untestable code.** If a function is hard to test (tightly coupled,
   hidden side effects, global state), say so and suggest the minimal
   restructuring needed rather than writing a brittle test around it.

## Exit check

- [ ] Full suite passes, not just the new tests — confirm nothing else broke.
- [ ] No skipped/pending tests silently hiding a real gap.

## Output format

```
## Test plan
- Happy path: ...
- Edge cases: ...
- Failure cases: ...
- Contract conformance: ...

## Code
(actual test file, using the project's existing test framework/conventions)

## Coverage gaps
Anything intentionally not covered, and why — including any untestable code flagged for restructuring.

## Result
✅ All passing / ❌ Failing — [specific case], cycling back to [Coding/Architecture]
```

## Anti-patterns to avoid

- Tests that just re-assert the mock's return value (testing nothing).
- Skipping failure-path tests because they're "less important."
- One giant test covering five behaviors — split it up.
- Chasing coverage percentage over coverage of what actually matters.
- Writing tests so tightly coupled to implementation details that a harmless
  refactor breaks them — that's a maintenance tax, not safety.
- Fixing a failing test by loosening the assertion instead of fixing the
  underlying behavior — that's hiding the bug, not resolving it.
