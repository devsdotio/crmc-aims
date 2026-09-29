# Consumables & stock

## Wired surfaces

| Layer | Path |
|-------|------|
| UI | `/consumables`, `/consumables/supplies`, `/consumables/materials`, `/issue-history` |
| Components | `src/components/consumables/*`, issue-history pages |
| Client | `src/features/consumables/*`, `src/features/stock-movements/*` |
| Server | `src/server/modules/consumables/`, `stock-movements/` |
| Schema | `consumables`, `stockMovements` |

## Capabilities

- List/create/update/delete consumables
- Adjust, checkout, issue, restock
- Movement history; void issue movements
- Inventory split by supply vs material in UI routes

## Key APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/consumables` |
| GET, PATCH, DELETE | `/api/consumables/:id` |
| POST | `/api/consumables/:id/adjust`, `.../checkout`, `.../issue`, `.../restock` |
| GET | `/api/consumables/:id/movements` |
| GET | `/api/stock-movements` |
| POST | `/api/stock-movements/:id/void` |

## Note

`src/features/consumables/actions.ts` is an unimplemented server-action stub — unused.
