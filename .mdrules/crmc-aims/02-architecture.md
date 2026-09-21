# 02 — Architecture & Design
> Load when the prompt asks to design a schema, API, system structure, or "how should this be built."

## Goal
Produce a design that would survive an actual architecture review — not just
"here's a shape," but something that names its trade-offs, failure modes, and
why alternatives were rejected, in a form the team can refer back to later
(this doubles as a lightweight ADR — Architecture Decision Record).

## Definition of Ready (check before architecture starts)
- [ ] A plan exists (`01-planning.md` output) with scope and acceptance criteria.
- [ ] Any spikes flagged in planning as blocking this design have been resolved.
If the plan is missing or a required spike hasn't run, say so and route back
rather than designing against an assumption.

## Process

1. **Reuse before inventing.** Check whether an existing pattern, module, or
   abstraction in the codebase already solves this shape of problem. Prefer
   extending it over creating a parallel one. If a new pattern really is
   warranted, say explicitly why the existing one doesn't fit.

2. **System context.** Before the detailed design, place it in context:
   - What's upstream of this (what calls it / what data feeds it)
   - What's downstream (what it calls, what depends on its output)
   - What existing system boundary this sits inside or crosses
   This is a few sentences, not a full diagram, unless the shape is complex
   enough that a diagram earns its place.

3. **Define the contract.** For any new API endpoint, function, or component:
   - Inputs, outputs, error cases, side effects
   - **Versioning** — is this a new version, or does it change an existing contract?
   - **Idempotency** — can this safely be retried? Should it be?
   - **Pagination/limits** — for anything returning a collection
   - **Error taxonomy** — distinguish client errors (4xx-style, bad input) from
     server/dependency errors (5xx-style, retry may help) so callers know how to react

4. **Data model changes:**
   - Show the before/after schema.
   - State backward compatibility; if not compatible, describe the migration path.
   - Consider what happens to existing rows/records (backfill? default value? nullable transition period?)
   - Note new indexes needed and why (what query pattern justifies them).
   - Note data retention/deletion implications if this touches user or sensitive data.

5. **Boundaries and ownership.** Be explicit about which layer owns what:
   - UI layer: presentation + local state only
   - API/service layer: business logic, validation
   - Data layer: persistence only, no business logic

6. **Non-functional requirements** — address explicitly, don't skip silently:
   - **Performance:** expected load, N+1 risks, indexing, caching strategy
   - **Security:** authz checks, input validation, injection risks, secrets handling
   - **Scalability:** what breaks first if usage 10x's, and roughly at what point
   - **Reliability:** what's the acceptable failure rate / SLA-equivalent for this piece
   - **Observability:** what needs to be logged/metriced/traced to debug this in production

7. **Failure modes & resilience.** For every external dependency this design
   introduces or touches (another service, third-party API, DB, queue):
   - What happens if it's slow? (timeout strategy)
   - What happens if it's down? (retry policy, fallback, graceful degradation, or explicit "this feature is unavailable")
   - Could a failure here cascade to unrelated features? If so, how is that contained?

8. **Lightweight security review.** Ask, per design (not exhaustive STRIDE, just the practical version):
   - Can this be used to access data the caller shouldn't see? (authz)
   - Can input here reach a DB query, shell command, or template unsanitized? (injection)
   - Is anything here logged that shouldn't be (secrets, PII)?

9. **Trade-offs (ADR-style).** For any non-obvious decision, record it so the
   reasoning isn't lost:
   - Option A vs Option B (vs C if relevant)
   - What was chosen, and the concrete reason — not "it's better" but "it's
     better *because* it avoids X" or "it's simpler and we don't need Y yet"
   - What would make the team revisit this decision later

10. **Sign-off.** State what "approved" looks like before Coding starts —
    explicit user go-ahead, or (for solo/agent flows) that the contract is
    stable enough that Coding won't immediately invalidate it.

## Output format
```
## System context
Upstream: ...
Downstream: ...

## Contract
Input: ...
Output: ...
Errors: ... (client vs server error taxonomy)
Idempotent: yes/no
Versioning: ...

## Data model (if applicable)
Before → After
Indexes added: ... (why)
Migration notes: ...
Retention/deletion notes: ...

## Non-functional requirements
Performance: ...
Security: ...
Scalability: ...
Reliability: ...
Observability: ...

## Failure modes
Dependency: ... → timeout/retry/fallback strategy: ...

## Diagram (if the shape is non-trivial)
(ASCII, mermaid, or description of component relationships)

## Trade-offs (ADR)
Option A vs Option B — chosen X because Y. Revisit if: Z.

## Sign-off
...
```

## Anti-patterns to avoid
- Over-engineering for scale the project doesn't need yet.
- Designing a "perfect" abstraction for a single current use case (YAGNI).
- Skipping the migration story for schema changes.
- Naming a failure mode without stating what the system actually does about it
  (a list of "what could go wrong" isn't a resilience plan).
- Trade-off notes that just assert a choice without the "because" — future
  readers (including the agent, next cycle) need the reasoning, not just the verdict.
- Security as an afterthought bullet instead of a checked question per design.