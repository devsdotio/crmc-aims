# Consumable requests

## Wired surfaces

| Layer | Path |
|-------|------|
| Staff UI | `/borrow-requests/supplies` (and redirect `/consumable-requests` → supplies) |
| Borrower UI | `/borrower-db/requests/supplies` |
| Server | `src/server/modules/consumable-requests/` |
| Client | `src/features/consumable-requests/*` |
| Schema | `consumableRequests`, `consumableRequestLines`, `consumableRequestReleaseAllocations` |

## Workflow

Statuses: `pending` | `approved` | `rejected` | `released` | `cancelled`  
Source: `portal` | `admin_manual`  
Stock deducted on **release**.

## Key APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/consumable-requests` |
| GET, PATCH | `/api/consumable-requests/:id` |
| POST | `/api/consumable-requests/:id/approve`, `reject`, `cancel`, `release`, `undo-approval` |
