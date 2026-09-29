# Categories & departments

## Wired surfaces

| Layer | Path |
|-------|------|
| UI | `/categories`, `/departments` (admin sidebar only) |
| Components | `CategoriesSection`, `DepartmentsSection` under settings-related components |
| Client | `src/features/categories/*`, `departments/*` |
| Server | `categories/category.repository.ts` only; `departments/` full controller stack |
| Schema | `categories`, `departments` |

## Key APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/categories` |
| PUT, DELETE | `/api/categories/:id` |
| GET, POST | `/api/departments` |
| GET, PATCH, DELETE | `/api/departments/:id` |

Categories support cascade update (`updateAndCascade` in repository).
