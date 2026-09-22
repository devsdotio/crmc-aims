# PANTHEON — synced personas

**Source of truth:** Obsidian vault `developer-io` → `agents/pantheon/`.

Formerly OCTAGON. Renamed because the roster is not limited to eight agents
(pipeline + kept tactical specialists).

```powershell
Copy-Item "$env:USERPROFILE/.antigravity-ide/developer-io/agents/pantheon/*.md" `
  -Destination ".agent/pantheon/" -Force
```

## Pipeline roster

| File | Role | Merged from (removed) |
|------|------|------------------------|
| `orchestrator.md` | Route + gates | — |
| `oracle.md` | Concept / PRD / plan | planner |
| `muse.md` | UI/UX | — |
| `atlas.md` | Architecture / ADRs | architect |
| `prism.md` | Frontend | — |
| `forge.md` | Backend | — |
| `sentinel.md` | Security (veto) | security-reviewer |
| `warden.md` | QA / TDD / go-no-go | tdd-guide |
| `courier.md` | DevOps / release | — |

## Kept outside (vault `agents/`)

e2e-runner · code-reviewer · build-error-resolver · refactor-cleaner · doc-updater

Process backbone: `.agent/phases/` + `.mdrules/`.
