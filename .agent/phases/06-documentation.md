# Phase 06 — Documentation (detailed process)
> Pairs with `.mdrules/crmc-aims/06-documentation.md`.

## Entry criteria
- [ ] 05-testing passed — behavior is confirmed correct and stable.

## Steps
1. Confirm the audience (developer README vs stakeholder summary vs inline comments).
2. Describe purpose before mechanics.
3. Include at least one real usage example.
4. Cross-check every documented behavior against the actual tested behavior —
   don't document intended behavior that testing didn't confirm.
5. Structure with clear headings; keep it skimmable.

## Exit criteria (all must be true to pass)
- [ ] Every claim in the docs matches confirmed (tested) behavior.
- [ ] At least one concrete usage example is present.

## Failure conditions
- Writing the docs surfaces a mismatch between what was built and what was
  actually requested (a scope problem, not a docs problem).
- Docs would require describing behavior that doesn't actually work as intended.

## On failure
- **Docs reveal a scope mismatch** → cycle back to `01-planning`. Carry
  forward: the specific mismatch between what was asked and what was built.
- **Docs reveal a code issue** → cycle back to `03-coding`.

## Retry limit
2 attempts. Documentation failures are rarer and usually mean an earlier
phase's misunderstanding — don't loop here more than twice before raising it.
