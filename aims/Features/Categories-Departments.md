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

## Asset taxonomy (general → specific)

| Type | Role | Example |
|------|------|---------|
| `asset_class` | General classification (addable in Categories) | Computer Equipments |
| `asset` | Specific category; optional `parentId` → `asset_class` | Monitors, Keyboards |
| `consumable` | Consumable category (unchanged) | Office Supplies |

Assets store denormalized `classification` (general class name) alongside `category` (specific). PO draft/delivery and asset create/update resolve classification from the category’s parent class.
