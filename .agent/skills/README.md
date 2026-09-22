# `.agent/skills/` — cloned workflow skills

**Source of truth:** vault `Workflows/skills/<name>.md` (flat notes).
**Repo mirror:** this folder (for Cursor agents working in-repo).

```powershell
Copy-Item "$env:USERPROFILE/.antigravity-ide/developer-io/Workflows/skills/*.md" `
  -Destination ".agent/skills/" -Force
```

Each PANTHEON / tactical agent names the skills it must read in its header.
See `../pantheon/orchestrator.md` for the full map. Load only named skills.
