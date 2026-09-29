# Projects

## Wired surfaces

| Layer | Path |
|-------|------|
| UI | `/projects` (admin sidebar only — not staff) |
| Components | `src/components/projects/*` |
| Client | `src/features/projects/*` |
| Server | `src/server/modules/projects/` (project + expense + asset assignment + progress services) |
| Schema | `projects`, `projectExpenseLines`, `projectAssetAssignments`, `projectProgressIndicators` |

## Capabilities

- Project CRUD
- Expense lines; batch materials; materials endpoints
- Assign / return / damage project assets
- Progress indicators CRUD
- Progress summaries aggregate

## Key APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/projects` |
| GET, PATCH, DELETE | `/api/projects/:id` |
| GET | `/api/projects/progress-summaries` |
| GET, POST | `/api/projects/:id/assets` |
| POST | `/api/projects/:id/assets/:assignmentId/return`, `.../damage` |
| GET, POST, PATCH, DELETE | `/api/projects/:id/expenses`, `.../indicators` |
| PATCH, DELETE | `/api/projects/:id/indicators/:indicatorId` |
| POST | `/api/projects/:id/expenses/batch-materials`, `.../materials` |

Also linked from Purchase Orders scope `projects`.
