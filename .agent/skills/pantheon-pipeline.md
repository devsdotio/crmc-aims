---
id: vault.skill.pantheon-pipeline
type: skill
project: vault
tier: 2
status: current
updated: 2026-09-22
source_of_truth: vault
name: pantheon-pipeline
description: Use when running a multi-phase feature from concept through deploy. Wires PANTHEON agents, SDLC phases, .mdrules gates, and supporting skills/tactical agents into one pipeline.
---

# PANTHEON Pipeline Skill

One gate system: **`.mdrules/` + `.agent/phases/`**. PANTHEON personas supply voice and
handoff artifacts. Skills live in **`.agent/skills/`** (cloned from vault `Workflows/skills/`).

Orchestrator: [[agents/pantheon/orchestrator]] · `.agent/pantheon/orchestrator.md`

## When to Activate

- "Build this feature end-to-end"
- "Run the full pipeline"
- Multi-step work that should not jump straight to coding
- User names a PANTHEON role (ORACLE, MUSE, ATLAS, ...)

## Pipeline sequence

```
ORACLE -> MUSE (if UI) -> ATLAS -> FORGE || PRISM -> SENTINEL -> WARDEN -> doc-updater -> COURIER
```

| Step | Agent | Phase | Also load (`.agent/skills/`) |
|------|-------|-------|------------------------------|
| 1 | `.agent/pantheon/oracle.md` | `01-planning` | `.mdrules/.../01-planning.md` |
| 2 | `.agent/pantheon/muse.md` | UX slice | `frontend-patterns.md` |
| 3 | `.agent/pantheon/atlas.md` | `02-architecture` | `backend-patterns.md`, `coding-standards.md` |
| 4a | `.agent/pantheon/forge.md` | `03-coding` BE | `backend-patterns.md`, `coding-standards.md`, `security-review.md` |
| 4b | `.agent/pantheon/prism.md` | `03-coding` FE | `frontend-patterns.md`, `coding-standards.md`, `tdd-workflow.md` |
| 5 | `.agent/pantheon/sentinel.md` | `04-review` | `security-review.md`, `verification-loop.md` |
| 6 | `.agent/pantheon/warden.md` | `05-testing` | `tdd-workflow.md`, `verification-loop.md`, `eval-harness.md` |
| 7 | vault `agents/doc-updater.md` | `06-documentation` | — |
| 8 | `.agent/pantheon/courier.md` | `07-deployment` | `verification-loop.md` |

## Tactical interrupts

| Interrupt | Agent | Skills | Resume |
|-----------|-------|--------|--------|
| Build/type failure | build-error-resolver | `coding-standards.md` | PRISM/FORGE |
| Dead code after green | refactor-cleaner | `coding-standards.md` | WARDEN re-check |
| Quality-only pre-merge | code-reviewer | `coding-standards.md`, `frontend-patterns.md` | SENTINEL if security |
| Playwright E2E | e2e-runner | `verification-loop.md`, `tdd-workflow.md` | WARDEN go/no-go |

## Handoff packet

1. What was decided
2. What was rejected and why
3. Open questions for the next agent
4. Definition-of-Ready checklist for the receiving phase

## Vetoes

- **SENTINEL** Critical/High -> halt -> owning agent -> re-review before WARDEN/COURIER
- **WARDEN** no-go -> COURIER refuses ship (unless user override)

## Anti-patterns

- Simulating the whole roster in one reply (unless full pipeline requested)
- Loading every skill at once
- Skipping ORACLE/ATLAS without user opt-out
- Treating tactical agents as a second gate system

## Project briefing

```
Read first:
- Projects/<P>/_Card.md
- Projects/<P>/agent-overrides.md
- Projects/<P>/Features/<slug>.md
Then: .agent/pantheon/<role>.md + only the skills listed for that role
```