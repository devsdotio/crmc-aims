# .mdrules — Agent Rule System

## What this is
Each subfolder under `.mdrules/` holds the rules for ONE project. Rules are split
by SDLC phase so the agent only loads what a given prompt actually needs instead
of the whole ruleset every time — this keeps context small and output consistent.

```
.mdrules/
  _template/          ← copy this to start a new project
    00-context.md
    01-planning.md
    02-architecture.md
    03-coding.md
    04-review.md
    05-testing.md
    06-documentation.md
    07-deployment.md
  project-alpha/
    ...same files, filled in for that project
  project-beta/
    ...
```

## How the agent should load these
1. Always load `00-context.md` first — it's small and tells the agent what the
   project is, its stack, and its non-negotiables. This should be loaded on
   every single prompt regardless of task type.
2. Detect the intent of the user's prompt and load ONLY the matching phase file(s):

| User intent (examples) | Load |
|---|---|
| "plan this feature", "break this down", "what's the approach" | `01-planning.md` |
| "design the schema/API/system", "how should this be structured" | `02-architecture.md` |
| "build/implement/write this", "add this feature", "fix this bug" | `03-coding.md` |
| "review this PR/diff/code" | `04-review.md` |
| "write tests", "is this covered", "check edge cases" | `05-testing.md` |
| "write docs/comments/README" | `06-documentation.md` |
| "ship this", "release", "CI/CD", "rollback" | `07-deployment.md` |

3. For a full feature request end-to-end, load them in numeric order and work
   through each phase's checklist before moving to the next — don't jump to
   `03-coding.md` before `01-planning.md` has produced a plan the user has seen.
4. If a rule in a phase file conflicts with something the user explicitly asked
   for in the current prompt, the user's explicit instruction wins for that
   turn — but the agent should say so out loud ("note: skipping X per your
   instruction, normally I'd do Y").

## Adding a new project
```bash
cp -r .mdrules/_template .mdrules/your-project-name
```
Then fill in `00-context.md` with the real stack/conventions. The other files
are written to be mostly stack-agnostic — edit only the sections marked
`<!-- PROJECT-SPECIFIC -->`.
