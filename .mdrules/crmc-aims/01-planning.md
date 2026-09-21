# 01 — Planning
> Load when the prompt asks for a plan, breakdown, feature scoping, or "how should I approach this."

## Goal
Turn a feature request or problem statement into a plan that would pass review
at a company with a real engineering process — not just "here are some steps,"
but something a tech lead could take into a planning meeting and defend.

## Definition of Ready (check before planning starts)
A request is ready to plan when:
- [ ] The problem/goal is stated in terms of user or business outcome, not just a feature name.
- [ ] It's clear who the requester/stakeholder is (even if that's just "the user, in this chat").
- [ ] Any hard constraints are known (deadline, must-support platform, must-integrate-with X).

If any of these are missing and can't be reasonably inferred, ask before
producing a plan — a plan built on a guessed goal is worse than no plan.

## Process

1. **Context & problem statement.** Restate the problem in 1–3 sentences,
   framed around the outcome ("users currently can't X, this lets them X") not
   just the mechanism. State what happens if this is *not* built — that's
   often the fastest way to sanity-check whether it's worth doing at all.

2. **Stakeholders & dependencies.** Identify:
   - Who consumes this (end user, another service, another team)
   - What this depends on (existing systems, APIs, data, other in-flight work)
   - What depends on this (anything blocked until this ships)
   Undeclared dependencies are the #1 cause of "surprise" delays.

3. **Requirements — functional and non-functional.** Don't only list what the
   feature does; also state:
   - Performance/scale expectations (rough is fine: "handles current traffic,"
     "must not add >200ms," etc.)
   - Security/privacy requirements if data or auth is involved
   - Compatibility constraints (browsers, API versions, backward compatibility)

4. **Scope boundaries.** Explicit IN scope / OUT of scope lists. Anything
   plausible-but-excluded should be named, not just omitted — "explicitly not
   handling bulk import in this pass" prevents silent scope renegotiation later.

5. **Technical approach — options, not just the answer.** Briefly note if
   there's more than one viable approach and why one is preferred. If the
   uncertainty is high enough that "we don't know until we try," flag it as a
   **spike** (a short, timeboxed investigation task) rather than guessing and
   writing it into the plan as settled. Full technical design belongs in the
   Architecture phase — this is just enough to size the work honestly.

6. **Task breakdown**, ordered by dependency, not by ease:
   - Each task: small enough to review in one sitting, independently testable
   - Estimate with T-shirt sizing (S/M/L) or story points — be consistent
     with whatever the project already uses (check `00-context.md`)
   - Mark hard dependencies between tasks explicitly (`Task 3 depends on Task 1`)
   - Flag anything that's actually a spike, not an implementation task

7. **Risk assessment.** For each identified risk, note rough likelihood and
   impact — this is what separates a risk *list* from a risk *assessment*:

   | Risk | Likelihood | Impact | Mitigation / owner |
   |---|---|---|---|
   | e.g. third-party rate limit unknown | Medium | High | Spike first; add caching fallback |

   Always explicitly consider: auth/permissions, payments, data
   migrations/deletion, third-party API behavior, and any part of the
   existing codebase known to be fragile or undocumented.

8. **Rollback / contingency.** Even at the planning stage: if this ships and
   turns out to be wrong, how bad is it to undo? Flag anything that's hard to
   reverse (schema changes, public API changes, anything customer-facing and
   sticky) — that's a signal it needs extra care in Architecture, not just Coding.

9. **Definition of Done.** Concrete, checkable acceptance criteria — not "it
   works" but "user can X, system returns Y on failure, edge case Z is
   handled, metric M is unaffected/improved." If there's a way to verify this
   objectively (a test, a metric, a specific manual check), say what it is.

10. **Communication / sign-off.** State who (if anyone) needs to review or
    approve this plan before work starts, and what "approved" looks like in
    this context (explicit user go-ahead, PR review, etc.).

## Output format
```
## Context
What problem, for whom, and why it matters. What happens if we don't do this.

## Stakeholders & dependencies
Consumers: ...
Depends on: ...
Blocks: ...

## Requirements
Functional: ...
Non-functional: ...

## In scope / Out of scope
In: ...
Out (explicitly excluded): ...

## Technical approach
Preferred approach: ...
Alternatives considered: ...
Spikes needed (if any): ...

## Task breakdown
1. [S] Task — why it's first, depends on: none
2. [M] Task — depends on: 1
...

## Risk assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
...

## Rollback / contingency
...

## Acceptance criteria (Definition of Done)
- [ ] ...

## Sign-off needed
...
```

## Anti-patterns to avoid
- Producing a plan so granular it's really just pseudo-code (that's the coding phase's job).
- Skipping risk identification because the task "seems simple" — simple tasks
  are exactly where an unstated assumption slips through.
- Planning the happy path only, with no mention of error states.
- Turning genuine unknowns into false certainty instead of flagging them as spikes.
- A risk *list* with no likelihood/impact/mitigation — that's not an assessment, it's a worry log.
- Skipping the "what if we don't build this" check — not everything requested needs to be built.