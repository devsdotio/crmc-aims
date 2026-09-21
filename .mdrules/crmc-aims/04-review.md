# 04 — Review
> Load when the prompt asks to review a diff, PR, or piece of code.

## Goal
Give a review a senior engineer would actually stand behind — one that
catches the things that matter, gives a clear decision, and treats the
author's self-review notes as a starting point to verify, not skip.

## Definition of Ready (check before review starts)
- [ ] The code being reviewed is complete enough to review (not a
      known-partial WIP, unless explicitly asked to review a WIP).
- [ ] If `03-coding.md`'s self-review notes are available, read them first —
      they tell you what the author already checked and what was
      intentionally deferred, so review time goes to verifying those claims
      and finding what they missed, not re-discovering the obvious from zero.

## Process
Review in this order — stop and flag blockers before commenting on style:

1. **Correctness.** Does it do what it claims to do? Trace through the logic
   with at least one real input, one edge case, and one failure case. If a
   contract exists from Architecture, check the implementation against it
   line by line — inputs, outputs, error taxonomy, idempotency.

2. **Security.** Injection risks, auth/authz gaps, secrets in code or logs,
   unvalidated input reaching a DB/shell/template/eval. Check that the secure
   coding baseline from `03-coding.md` (parameterized queries, least
   privilege, no hardcoded secrets) was actually followed, not just claimed.

3. **Error handling & resilience.** Are failure modes handled, or does
   something fail silently / crash ungracefully? For external dependencies,
   confirm the timeout/retry/fallback behavior matches what Architecture decided.

4. **Performance sanity check.** Obvious problems only at this stage — N+1
   queries, unbounded loops over unbounded data, loading far more than
   needed. Don't nitpick micro-optimizations that don't affect correctness or
   real-world load.

5. **Observability.** If Architecture specified logging/metrics/tracing for
   this piece, is it actually present — and does it avoid logging secrets or PII?

6. **Consistency.** Does it match existing patterns and conventions in `00-context.md`?

7. **Test coverage sanity check.** Not a full testing pass (that's
   `05-testing.md`), but: are there tests at all for new logic, and do they
   look like they'd catch a regression, or just re-assert the implementation?
   Flag a conspicuous absence of tests as a 🔴/🟡 depending on risk, don't
   silently defer it to the testing phase.

8. **Readability.** Would another engineer understand this in 6 months
   without asking the author?

9. **Style/nitpicks last**, and label them clearly as optional.

## Severity labels (use these in every review)
- 🔴 **Blocker** — must fix before merge (bug, security issue, breaks contract, missing tests on risky logic)
- 🟡 **Should fix** — not blocking but meaningfully improves quality
- 🟢 **Nit** — optional, purely stylistic

## Decision
Every review ends with one explicit outcome, not just a list of comments:
- ✅ **Approve** — no blockers, ship it
- ✅🟡 **Approve with follow-ups** — no blockers, but 🟡 items should be
  tracked (as a task, not forgotten) even if not fixed now
- ❌ **Request changes** — one or more 🔴 blockers present; cycles back to Coding

## Output format
```
## Summary
1–2 sentence overall assessment.

## Decision
✅ Approve / ✅🟡 Approve with follow-ups / ❌ Request changes

## 🔴 Blockers
- [file:line] issue — why it matters — suggested fix

## 🟡 Should fix
- ...

## 🟢 Nits
- ...

## What's good
Call out at least one thing done well — reviews aren't just fault-finding.
```

## Anti-patterns to avoid
- Nitpick-only reviews that miss a real correctness or security issue.
- Rewriting the author's code in the review instead of explaining the issue.
- Vague comments ("this could be better") without a concrete suggestion.
- Trusting the author's self-review notes without spot-checking them.
- Ending a review with a comment list but no clear approve/request-changes
  decision — ambiguity here just moves the decision to whoever reads it next.
- Treating "no tests were written" as a nitpick instead of weighing it by how
  risky the untested logic actually is.