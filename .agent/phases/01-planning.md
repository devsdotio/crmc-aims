# Phase 01 — Planning (detailed process)
> Pairs with `.mdrules/crmc-aims/01-planning.md` for the rules. This file is the step-by-step execution + failure handling.

## Entry criteria
- [ ] A user request or problem statement exists (even if rough).

## Steps
1. Restate the problem in 1–3 sentences.
2. List explicit in-scope / out-of-scope items.
3. Break into ordered, sized tasks (S/M/L).
4. Call out risks/unknowns (auth, payments, migrations, unfamiliar APIs).
5. Write concrete, checkable acceptance criteria.
6. Present the plan for implicit or explicit approval before moving to Architecture.

## Exit criteria (all must be true to pass)
- [ ] Scope is unambiguous — no "and maybe also" left unresolved.
- [ ] Every task in the breakdown is independently testable.
- [ ] At least one risk/unknown has been named, or explicitly confirmed there are none.
- [ ] Acceptance criteria are concrete (not "it works").

## Failure conditions
- Scope still has an unresolved fork that changes the architecture (e.g. "should this be real-time or batch?" unanswered).
- Task breakdown is really just pseudo-code — too granular, or too vague to size.
- No risks identified on a task that obviously has some (touches auth/payments/data deletion).

## On failure
- **Retry in place** if the fix is just re-scoping the same request with new info.
- **This phase can't cycle further back** — it's the first phase. If the user's
  original request itself is unclear even after asking, that's a clarifying
  question to the user, not an internal retry.

## Retry limit
3 attempts. On the 3rd failed attempt, stop and ask the user directly to
resolve the specific ambiguity rather than guessing a 4th time.
