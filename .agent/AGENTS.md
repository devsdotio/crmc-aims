# Layout & Height Conventions

- **Viewport Height Ownership**: Exactly one element in the tree owns `h-screen` (or `h-full` on `html` and `body` at the outermost app shell). Every layout container below it uses `h-full` to inherit, never a second `h-screen` or `min-h-screen`.
- **Scoped Scrolling**: Any container that scrolls independently (sidebar nav, main content area, modal body) must have `overflow-y-auto` scoped directly to itself — never let scroll behavior default to the entire document/page.
- **Skeleton & Loading Heights**: Skeleton/loading states must match the real content's height exactly, or use the same component in a loading prop-state rather than a separate placeholder with its own hardcoded/fixed height.

# Tailwind & CSS Variable Conventions

- **Theme Utility Precedence**: Before writing any arbitrary-value class using CSS-variable syntax (`rounded-(--x)`, `text-(--x)`, `bg-[var(--x)]`, etc.), check `globals.css`'s `@theme` block first. If the variable is already mapped to a named utility there, use the named utility (`rounded-lg`, `text-text`, `bg-bg-subtle`) — never the raw variable reference.
- **Design Tokens in `@theme`**: Arbitrary CSS-variable syntax is only acceptable for one-off values that are NOT part of the design token system. If a new design token is needed repeatedly, add it to `@theme` in `globals.css` first, then use its generated utility.

# Obsidian Vault & Session Automation

The `developer-io` Obsidian vault (`C:/Users/CLIET/.antigravity-ide/developer-io`) is the single source of truth for project knowledge, session state, and workflows. This strictly follows the **everything-claude-code workflow system**.

### 1. Mandatory Session Bootstrap (Memory Persistence)

Before performing codebase exploration or writing code for non-trivial tasks, check the vault notes to save tokens. Do not blindly read all notes or scan the repository. Read selectively:

1. **Always Read:** `Context/Sessions.md` (read only the last entry to pick up where the previous session left off) and `Projects/crmc-aims/Tasks.md` (read the active/pending roadmap).
2. **Read Selectively Based on Task:**
   - Schema/Backend changes -> `Projects/crmc-aims/DataModel.md`
   - System design/refactoring -> `Projects/crmc-aims/Architecture.md`
   - UI/Styling constraints -> `Projects/crmc-aims/Conventions.md`
   - _Only_ read `Projects/crmc-aims/Overview.md` if completely lost on the project domain.

### 2. Task-to-Agent Delegation Matrix & Subagent Orchestration

Adopt the specialized subagent persona and workflow from `Workflows/Agents.md` based on the request:

- **Complex / Multi-file Feature:** Act as **Planner** (generate implementation plan before editing).
- **Schema, Auth, or System Design:** Act as **Architect** (verify against `DataModel.md` and `Architecture.md`).
- **Build / Lint / Type Failure:** Act as **Build Error Resolver** (fix root cause without suppressions or ad-hoc any-casts).
- **Refactoring / Cleanup:** Act as **Refactor Cleaner** (remove dead code, ensure component modularity).
- **Pre-Completion Quality Check:** Act as **Code Reviewer** (verify against layout height ownership and Tailwind `@theme` conventions).

**The Context Problem:** When delegating to subagents, pass only the relevant vault notes as context (not full source files). Use `Projects/crmc-aims/Architecture.md` and `Projects/crmc-aims/Conventions.md` as the subagent briefing to save tokens.

### 3. Continuous Learning & Automated Change Logging

Whenever code is modified, new patterns emerge, or a session concludes:

- **Unlisted Tasks First:** If requested to perform a task that is not already listed, ALWAYS update `Projects/crmc-aims/Tasks.md` first.
- **Task Auto-Completion:** When any feature/bugfix is verified, check it off in `Projects/crmc-aims/Tasks.md` (`- [ ]` → `- [x] ✅ YYYY-MM-DD`).
- **Code Changes:** Prepend a new changelog entry to the `## Recent Changes` section in `Projects/crmc-aims/Changelog.md`. If >3 entries, move oldest to `Changelog-Archive.md`.
- **New Component Discovered:** Update `Projects/crmc-aims/Components/Index.md`.
- **Architecture / Tech Decisions:** Log to `Context/Decisions.md` to avoid re-reasoning.
- **Convention Established (Continuous Learning):** Auto-extract reusable patterns and log to `Projects/crmc-aims/Conventions.md` immediately.

### 4. Verification Loops

After any significant change, enforce a strict verification loop:

- Build verification: `npm run build`
- Lint: `npm run lint`
- Manual smoke test on affected routes.

### 5. Strategic Compaction & Session End

- **Task & Sprint Synchronization:** Before concluding or compacting, ALWAYS synchronize `Projects/crmc-aims/Tasks.md` — verify that completed work is checked off (`- [x] ✅ YYYY-MM-DD`), update the status of the `## 🎯 Active Sprint`, and ensure any new or remaining backlog items are properly reflected under active or pending milestones.
- **Session Snapshot Logging:** Prepend a session snapshot to the top of the `## Sessions Log` section in `Context/Sessions.md` detailing active files, work completed, blockers, and next steps (using `Templates/Session-Snapshot` structure). Do not create new session files. If the file exceeds 3 entries, move the oldest to `Sessions-Archive.md`.
