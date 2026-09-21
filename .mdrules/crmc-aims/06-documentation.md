# 06 — Documentation
> Load when the prompt asks for docs, comments, READMEs, or explanations meant to be saved/shared.

## Goal
Produce documentation that stays true after the code ships, tells the reader
what they actually need before they need to ask, and doesn't quietly drift
from reality the next time the code changes.

## Definition of Ready (check before documentation starts)
- [ ] Testing (`05-testing.md`) passed — document confirmed behavior, not
      intended-but-unverified behavior.
- [ ] Any trade-offs recorded in Architecture's ADR notes are available to
      reference if the docs need to explain *why*, not just *what*.

## Process

1. **Identify the doc type before writing** — each has a different shape and audience:
   - **README** — orientation for a developer new to this project/module
   - **API reference** — precise contract (endpoints, params, responses, errors) for integrators
   - **Inline comments/docstrings** — for someone reading the code directly
   - **ADR/design note** — the *why* behind a decision, for future maintainers questioning it
   - **Changelog entry** — what changed, for someone tracking releases
   - **Runbook** — operational steps for someone on-call, if this introduces something operable (a service, a job, a migration)
   Confirm which is being requested; don't default to README-shape for
   everything.

2. **Match the audience.** A README for other developers ≠ a guide for
   non-technical stakeholders ≠ inline code comments. Adjust vocabulary and
   depth accordingly — a runbook should be followable under pressure at 2am,
   an ADR can assume deep context.

3. **Lead with purpose, not mechanics.** Say what something is for before how
   it works internally. If there's a non-obvious *why* behind the design
   (pull from Architecture's trade-off notes), surface it — that's often what
   saves a future reader from "fixing" something that was deliberate.

4. **Show, don't just tell.** Include a real usage example (command, code
   snippet, request/response pair) wherever possible — verified against
   actual tested behavior, not written from memory of what it should do.

5. **Document the failure modes, not just the happy path.** For an API or
   service: what error responses look like and what they mean, not just the
   success case. For a runbook: what to do when it's broken, not just how to
   start it.

6. **Keep it maintainable.** Avoid documenting details that will go stale fast
   (exact line numbers, internal variable names) unless necessary. Prefer
   linking to the source of truth (the code, the schema) over duplicating it
   somewhere that can drift.

7. **Structure long docs with a clear hierarchy** — headings, short sections,
   no walls of text. A reader skimming for one answer should find it in
   seconds, not by reading top to bottom.

8. **Note deprecations explicitly**, if this change replaces or obsoletes
   something previously documented — don't leave two conflicting docs live.

## Output format (README-style — adapt structure per doc type from step 1)
```
# Title
One-line description.

## Purpose / Why this exists
Including the non-obvious "why," if there is one.

## Usage
Concrete, verified example.

## Error / failure behavior
What can go wrong and what the caller/operator sees.

## Configuration (if applicable)

## Notes / gotchas

## Deprecates / supersedes (if applicable)
```

## Anti-patterns to avoid
- Documentation that just restates the code line by line.
- Over-documenting trivial code, under-documenting the tricky/non-obvious parts.
- Letting docs drift from actual behavior — flag if something described no
  longer matches the code being documented, rather than documenting the
  intended behavior as if it were confirmed.
- Happy-path-only docs that leave error/failure behavior undocumented.
- Duplicating a detail that will go stale (exact schema, exact config values)
  instead of linking to the live source of truth.
- Writing docs before the code is confirmed stable — documenting a moving target.