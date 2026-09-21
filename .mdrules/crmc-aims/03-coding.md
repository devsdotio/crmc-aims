# 03 — Coding
> Load when the prompt asks to implement, build, fix, or modify code.

## Goal
Produce code a senior engineer would approve in review on the first pass —
correct, secure, readable, and honest about what it doesn't handle — not just
code that satisfies the happy path.

## Definition of Ready (check before coding starts)
- [ ] A contract exists for what's being built (from `02-architecture.md`) —
      inputs, outputs, errors, at minimum. For trivial fixes this can be
      implicit; for new endpoints/components it should be explicit.
- [ ] Any non-functional requirements that affect this code (performance,
      security, observability) from Architecture are known, not just the
      functional shape.

If there's no contract and this isn't a trivial fix, either infer a minimal
one and state the assumption, or route back to Architecture first.

## Process

1. **Read before writing.** Check the relevant existing files/patterns before
   generating new code. Match existing style, naming, and structure over
   introducing a new one.

2. **Smallest correct change.** Don't refactor unrelated code while fixing a
   bug or adding a feature, unless asked. Flag refactor opportunities
   separately instead of doing them inline.

3. **Secure coding baseline** — apply by default, not only when asked:
   - Validate and sanitize all input at boundaries (API routes, form
     submissions, function args from outside the module)
   - Never build queries/commands/templates via raw string concatenation of
     user input — use parameterized queries, safe templating, escaping
   - Never hardcode secrets, tokens, or credentials — read from config/env
   - Apply least privilege — a function/endpoint should only access what it
     needs, not reuse a broad admin-level credential for convenience

4. **Handle errors explicitly.** No silent failures, no empty catch blocks,
   no swallowed promise rejections. Every external call (API, DB, file I/O)
   needs a defined failure path, matching the failure-mode strategy decided
   in Architecture (timeout, retry, fallback) rather than inventing a new one ad hoc.

5. **Respect concurrency and resource lifecycle.**
   - Close/release what you open (connections, file handles, locks) — including on the error path
   - If a function can be called concurrently or retried (per the contract's
     idempotency note), make sure that's actually safe — no unguarded
     read-then-write on shared state where a race would corrupt it

6. **Observability hooks.** If Architecture specified what should be
   logged/metriced/traced for this piece, add it here — don't leave
   debuggability as a follow-up. Log enough to diagnose a failure in
   production without logging secrets or PII.

7. **Performance discipline, not premature optimization.** Avoid the obvious
   mistakes (N+1 queries, O(n²) where O(n) is easy, loading more data than
   needed) but don't hand-optimize something with no evidence it's a
   bottleneck — that trade-off belongs in Architecture if it's a real concern.

8. **Dependency discipline.** Before adding a new library:
   - Check whether something already in the project solves this
   - Prefer a well-maintained, appropriately-scoped dependency over a large
     one for a small need
   - Pin/lock versions per the project's existing convention

9. **Write code that's testable as you go**, not code that has to be
   restructured later to be tested — favor pure functions and dependency
   injection over hidden global state and tightly coupled I/O, so
   `05-testing.md` isn't fighting the implementation.

10. **No dead code, no commented-out blocks, no `console.log`/`print`
    debugging left behind** in the final version.

11. **Naming.** Names should say what something is/does, not how it's
    implemented. Avoid abbreviations unless they're already idiomatic in the codebase.

12. **Self-review before handoff.** Before marking this done, check the
    implementation against the Architecture contract line by line — inputs,
    outputs, errors, idempotency — the way a reviewer would, before Review
    even sees it.

## Code style defaults (override in 00-context.md if different)
<!-- PROJECT-SPECIFIC -->
- Functions: small, single-purpose, early-return over deep nesting
- Comments: explain *why*, not *what* — code should be readable enough that
  "what" is self-evident
- No magic numbers/strings — use named constants
- Async: prefer async/await over raw `.then()` chains (JS/TS)
- Type safety: use types/interfaces for all public function signatures (TS/Python typing)
- Commit style: atomic, one logical change per commit, matching the project's
  commit convention from `00-context.md` (e.g. Conventional Commits)

## Output format
- For new files: full file content.
- For edits to existing files: a diff or clearly marked before/after snippet —
  not a full-file dump unless the file is short or heavily changed.
- A one-line summary of what changed and why, above the code.
- A short self-review note: what was checked against the contract, and
  anything intentionally deferred (with a reason) — so Review isn't
  discovering known gaps from scratch.

## Anti-patterns to avoid
- Introducing a new dependency for something one small function could solve.
- Copy-pasting a block instead of extracting a shared function.
- "Fixing" a bug by broadening a try/catch instead of addressing the cause.
- Validating input on the happy path but trusting it again deeper in the call
  stack "because it was already checked" — boundaries should stay defensive.
- Adding logging/metrics only after something breaks in production instead of
  per the observability plan from Architecture.
- Treating "it compiles and the happy path works" as done without checking
  the error paths the contract promised.