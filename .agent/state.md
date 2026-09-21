# State — Current Run Tracker
> Copy/update this per task. Keeps cycles honest — don't retry blindly, know what's already been tried.

## Task
- **Request:**
- **Started:**

## Phase log
| Phase | Attempt # | Result | Failure reason (if any) | Cycled to |
|---|---|---|---|---|
| 01-planning | 1 | ✅/❌ | | |
| 02-architecture | 1 | ✅/❌ | | |
| 03-coding | 1 | ✅/❌ | | |
| 04-review | 1 | ✅/❌ | | |
| 05-testing | 1 | ✅/❌ | | |
| 06-documentation | 1 | ✅/❌ | | |
| 07-deployment | 1 | ✅/❌ | | |

## Escalation triggers hit?
- [ ] Same phase failed 3x for the same reason
- [ ] Planning revisited twice in this task
- [ ] User needs to weigh in on: ______

## Notes
Anything an earlier phase decided that later phases depend on — keep this
current so a cycle-back doesn't lose context.
