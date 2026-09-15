# Layout & Height Conventions

- **Viewport Height Ownership**: Exactly one element in the tree owns `h-screen` (or `h-full` on `html` and `body` at the outermost app shell). Every layout container below it uses `h-full` to inherit, never a second `h-screen` or `min-h-screen`.
- **Scoped Scrolling**: Any container that scrolls independently (sidebar nav, main content area, modal body) must have `overflow-y-auto` scoped directly to itself — never let scroll behavior default to the entire document/page.
- **Skeleton & Loading Heights**: Skeleton/loading states must match the real content's height exactly, or use the same component in a loading prop-state rather than a separate placeholder with its own hardcoded/fixed height.

# Tailwind & CSS Variable Conventions

- **Theme Utility Precedence**: Before writing any arbitrary-value class using CSS-variable syntax (`rounded-(--x)`, `text-(--x)`, `bg-[var(--x)]`, etc.), check `globals.css`'s `@theme` block first. If the variable is already mapped to a named utility there, use the named utility (`rounded-lg`, `text-text`, `bg-bg-subtle`) — never the raw variable reference.
- **Design Tokens in `@theme`**: Arbitrary CSS-variable syntax is only acceptable for one-off values that are NOT part of the design token system. If a new design token is needed repeatedly, add it to `@theme` in `globals.css` first, then use its generated utility.

# Obsidian Vault & Session Automation

The `developer-io` Obsidian vault (`C:/Users/CLIET/.antigravity-ide/developer-io`) is the single source of truth for project knowledge, session state, and workflows.

### 1. Mandatory Session Bootstrap (Auto-Read Context)

Before performing codebase exploration or writing code for non-trivial tasks:

- **Do not blindly scan the repository with broad directory searches.**
- Check the vault notes first to save tokens:
  1. `Projects/crmc-aims/Overview.md` & `Architecture.md` (Tech stack, feature routing)
  2. `Projects/crmc-aims/Conventions.md` (Domain constraints)
  3. `Context/Sessions.md` (Read the last entry to know exactly where the previous session left off)

### 2. Task-to-Agent Delegation Matrix

Adopt the specialized subagent persona and workflow from `Workflows/Agents.md` based on the request:

- **Complex / Multi-file Feature:** Act as **Planner** (generate implementation plan before editing).
- **Schema, Auth, or System Design:** Act as **Architect** (verify against `DataModel.md` and `Architecture.md`).
- **Build / Lint / Type Failure:** Act as **Build Error Resolver** (fix root cause without suppressions or ad-hoc any-casts).
- **Refactoring / Cleanup:** Act as **Refactor Cleaner** (remove dead code, ensure component modularity).
- **Pre-Completion Quality Check:** Act as **Code Reviewer** (verify against layout height ownership and Tailwind `@theme` conventions).

### 3. Automated Change, Task & Session Logging

Whenever code is modified, features complete, or a session concludes:

- **Unlisted Tasks First:** If requested to perform a task that is not already listed in the vault's `Tasks.md`, ALWAYS update `Tasks.md` first to add the new task before starting work on it. This ensures solid documentation and saves tokens.
- **Task Auto-Completion:** When any feature, bugfix, or subtask is completed and verified, immediately check it off in `Projects/crmc-aims/Tasks.md` (`- [ ]` → `- [x]`) and append the completion date (`✅ YYYY-MM-DD`). If all nested subtasks are done, mark the parent milestone complete as well.
- **Code Changes:** Create a new markdown file in `Projects/crmc-aims/Changelog/YYYY-MM/` (e.g., `2026-09-15-feature-name.md`) containing a brief title, modified files, and the rationale.
- **Architecture / Tech Decisions:** If an architectural trade-off or permanent standard was decided, append an ADR to `Context/Decisions.md`.
- **Session End / Compaction:** Create a new session snapshot file in `Context/Sessions/YYYY-MM/` (e.g., `2026-09-15-session-summary.md`) detailing active files, work completed, and pending items.

