# Purchase orders (purchase lots)

## Wired surfaces

| Layer | Path |
|-------|------|
| UI | `/purchase-orders` (+ `/asset`, `/assets` alias, `/supplies`, `/materials`, `/projects`, `/consumables`) |
| Components | `src/components/purchase-orders/*` (`PurchaseOrdersView` with scope) |
| Client | `src/features/purchase-lots/*` |
| Server | `src/server/modules/purchase-lots/` (+ `po-departments`, `po-disbursement`, delete-impact) |
| Schema | `purchaseLots`, `purchaseOrderDepartments` |

## Item types

`consumable` | `asset` (schema enum)

## Status (app-level, in notes metadata)

`pending_approval` | `approved` | `ordered` | `delivered` | `cancelled`  
— not a Postgres enum column.

## Capabilities

- CRUD lots / lines
- Status transitions
- By-code lookup, delete-impact, delete-by-PO
- Receipt upload; scan release
- FIFO consume / lot recording (service)

## Key APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/purchase-lots` |
| GET, PATCH, DELETE | `/api/purchase-lots/:id` |
| POST | `/api/purchase-lots/:id/lines` |
| POST, PATCH | `/api/purchase-lots/:id/status` |
| GET | `/api/purchase-lots/by-code`, `.../delete-impact` |
| DELETE | `/api/purchase-lots/by-po` |
| POST | `/api/purchase-lots/receipt/upload`, `.../scan/release` |

Sidebar scopes: Asset, Supplies, Materials, Projects. `/purchase-orders/consumables` exists but is **not** in sidebar.
