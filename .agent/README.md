# .agent — Process Orchestration

## Relationship to `.mdrules`
- `.mdrules/crmc-aims/*.md` = **what the rules are** for each phase (standards, checklists, output format).
- `.agent/*` = **how to move between phases** — entry/exit criteria, and critically,
  what to do when a phase FAILS and needs to cycle back to an earlier one.

Think of `.mdrules` as the rulebook per station, and `.agent` as the conveyor
belt logic connecting the stations, including what happens when a part fails
inspection and gets sent back a step.

## Files
```
.agent/
  README.md            ← this file
  workflow.md           ← human-readable flow diagram + cycle rules
  workflow.json         ← machine-readable state machine (for tools that parse it)
  state.md               ← template for tracking current run state
  phases/
    01-planning.md
    02-architecture.md
    03-coding.md
    04-review.md
    05-testing.md
    06-documentation.md
    07-deployment.md
```

Each file in `phases/` mirrors the numbering in `.mdrules/crmc-aims/` but adds:
- **Entry criteria** — what must be true to start this phase
- **Exit criteria** — the pass condition to move forward
- **Failure conditions** — what counts as a fail, not just a nitpick
- **On failure** — exactly which phase to cycle back to, and what context to carry back
- **Retry limit** — after how many failed cycles the agent stops looping and escalates to the user

## How the agent should use this
1. On any multi-step task ("build this feature", "ship this"), load `workflow.md`
   first to know the phase order and cycle rules.
2. Before starting a phase, check that file's **Entry criteria** — don't start
   coding if planning was never approved, don't start testing on code that
   failed review.
3. At the end of a phase, check **Exit criteria**. If not met, follow **On
   failure** — go back to the stated phase, carrying forward the specific
   reason for the failure (not the whole history, just what needs fixing).
4. Track attempts using `state.md`. If a single phase fails the same check
   more than its retry limit, STOP cycling automatically and surface it to the
   user with a clear summary of what's been tried and why it keeps failing.
   Looping silently forever is the failure mode this file exists to prevent.
5. Never skip a phase to save time unless the user explicitly says to (e.g.
   "skip planning, just write the code").

## Golden rule
A failure at phase N is information for phase N-1 (or earlier), not just a
reason to retry phase N with the same inputs. Cycling back means the earlier
phase's output gets corrected, not just re-attempting the failed phase blindly.
