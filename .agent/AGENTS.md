# Layout & Height Conventions

- **Viewport Height Ownership**: Exactly one element in the tree owns `h-screen` (or `h-full` on `html` and `body` at the outermost app shell). Every layout container below it uses `h-full` to inherit, never a second `h-screen` or `min-h-screen`.
- **Scoped Scrolling**: Any container that scrolls independently (sidebar nav, main content area, modal body) must have `overflow-y-auto` scoped directly to itself — never let scroll behavior default to the entire document/page.
- **Skeleton & Loading Heights**: Skeleton/loading states must match the real content's height exactly, or use the same component in a loading prop-state rather than a separate placeholder with its own hardcoded/fixed height.

# Tailwind & CSS Variable Conventions

- **Theme Utility Precedence**: Before writing any arbitrary-value class using CSS-variable syntax (`rounded-(--x)`, `text-(--x)`, `bg-[var(--x)]`, etc.), check `globals.css`'s `@theme` block first. If the variable is already mapped to a named utility there, use the named utility (`rounded-lg`, `text-text`, `bg-bg-subtle`) — never the raw variable reference.
- **Design Tokens in `@theme`**: Arbitrary CSS-variable syntax is only acceptable for one-off values that are NOT part of the design token system. If a new design token is needed repeatedly, add it to `@theme` in `globals.css` first, then use its generated utility.

# Obsidian Vault & Session Automation

Vault: `C:/Users/CLIET/.antigravity-ide/developer-io` (branch `vault/optimization`).  
Protocol: `Meta/Context-Loading-Protocol.md`.

### 1. Session bootstrap (Tier 0)

Before exploring the codebase, **do not** load Overview + Architecture + Conventions + Tasks + Sessions by default.

1. **Always read only:** `Projects/CRMC-Aims/_Card.md` (stack, invariants, sprint, hot paths, last session).
2. **Then**, using the task router in `Meta/Context-Loading-Protocol.md`, name extra notes **before** reading them:
   - Single feature → `Projects/CRMC-Aims/Features/<slug>.md` only (Tier 1.5)
   - Schema → DataModel (relevant section)
   - Cross-cutting design → Architecture + Conventions
   - Auth/security → Architecture auth section + `Projects/CRMC-Aims/agent-overrides.md`
3. Do **not** read full `Tasks.md` or `Context/Sessions.md` at cold start — sprint/last-session live on the card. Open them only when updating checkboxes or writing history.

### 2. Agent delegation

Use `Workflows/Agents.md` personas. Brief subagents with `_Card.md` + `agent-overrides.md` + the one Features note (not whole Architecture unless cross-cutting).

- Multi-file feature → Planner  
- Schema / system design → Architect  
- Build/type failure → Build Error Resolver (fast model; 2 attempts then escalate)  
- Cleanup → Refactor Cleaner  
- Pre-merge quality → Code Reviewer (layout + `@theme` rules above)

### 3. Change logging (prefer tooling)

From vault root:

```bash
node Meta/scripts/vault-track.mjs session --project crmc-aims --write
node Meta/scripts/vault-track.mjs stale --project crmc-aims
node Meta/scripts/vault-track.mjs changelog --project crmc-aims --range origin/main..HEAD
```

Still update when needed:

- Unlisted work → add checkbox under Active Sprint in `Projects/CRMC-Aims/Tasks.md` first  
- Feature facts → `Projects/CRMC-Aims/Features/<slug>.md` (Index is a rollup)  
- Decisions → `Projects/CRMC-Aims/Context/Decisions.md` or vault `Context/Decisions.md`  
- New conventions → `Projects/CRMC-Aims/Conventions.md`

### 4. Verification

After significant changes: `npm run lint`, `npx tsc --noEmit` or `npm run build`, smoke the affected routes.

### 5. Session end

1. Sync Active Sprint checkboxes on `Tasks.md` if you touched them  
2. `vault-track session --write` (or prepend snapshot; keep ≤3 recent entries in `Sessions.md`)  
3. `vault-track stale`  
4. Update `_Card.md` last-session / sprint line if it moved  
5. Changelog only for **pushed** commits
