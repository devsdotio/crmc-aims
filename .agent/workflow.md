# Workflow — Phase Flow & Cycle Rules

## Flow diagram
```
                    ┌─────────────┐
                    │  01 Planning │◄──────────────────────────────────┐
                    └──────┬──────┘                                    │
                           │ pass                                      │ fail (unclear/wrong scope)
                           ▼                                           │
                    ┌──────────────┐                                   │
                    │ 02 Architecture│◄──────────────────────┐         │
                    └──────┬───────┘                         │         │
                           │ pass                            │ fail    │ fail
                           ▼                                 │(design  │(scope was
                    ┌──────────────┐                         │ flaw)   │ wrong)
                    │  03 Coding    │◄─────────┐             │         │
                    └──────┬───────┘           │             │         │
                           │ pass              │ fail        │         │
                           ▼                   │(bugs/       │         │
                    ┌──────────────┐           │ blocker)    │         │
                    │  04 Review    │──────────┘             │         │
                    └──────┬───────┘                         │         │
                           │ pass                            │         │
                           ▼                                 │         │
                    ┌──────────────┐                         │         │
                    │  05 Testing   │────────────────────────┘         │
                    └──────┬───────┘  fail (test reveals design flaw)  │
                           │ pass                                      │
                           ▼                                           │
                    ┌──────────────┐  fail (scope was wrong all along) │
                    │06 Documentation│─────────────────────────────────┘
                    └──────┬───────┘
                           │ pass
                           ▼
                    ┌──────────────┐
                    │ 07 Deployment │──── fail (pre-flight check fails) ──► back to 03 or 05
                    └──────┬───────┘      depending on what failed
                           │ pass
                           ▼
                        ✅ Done
```

## Cycle rules (which failure goes where)

| Phase fails at | Root cause is usually | Cycle back to | Carry forward |
|---|---|---|---|
| Architecture | Scope was ambiguous/wrong | 01 Planning | Specific gap in the plan that architecture exposed |
| Coding | Design doesn't hold up when implemented | 02 Architecture | The exact contract/assumption that broke |
| Coding | Simple bug, design was fine | 03 Coding (retry) | The failing case only |
| Review | Blocker found (🔴 in `.mdrules/04-review.md`) | 03 Coding | The specific blocker(s), not a full re-read |
| Review | Reveals a design gap, not just a code issue | 02 Architecture | What the design missed |
| Testing | Edge case fails | 03 Coding (retry) | The specific failing test case |
| Testing | Edge case reveals the design can't support it | 02 Architecture | What the design needs to account for |
| Deployment | Pre-flight check fails (tests red) | 05 Testing | Which check failed |
| Deployment | Pre-flight check fails (migration unsafe) | 02 Architecture | The migration issue |

**Rule of thumb:** if fixing it only touches the current phase's output, retry
in place. If fixing it means an earlier phase's decision was wrong, cycle back
to that phase — don't patch symptoms downstream.

## Retry limits
- Same phase, same reason, **3 failed attempts** → stop, summarize to the user
  what's been tried, and ask for guidance instead of trying a 4th variation.
- Any cycle that touches Planning **twice** in one task → stop and get
  explicit user confirmation on scope before continuing; this usually means
  the original request needs to be re-scoped with the user, not guessed at again.

## State tracking
Use `state.md` (or the agent's own scratch memory) to record, per phase:
attempt count, last failure reason, what changed between attempts. This
prevents the agent from silently repeating an approach that already failed.
