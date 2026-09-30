# Test coverage map

Append new `*.test.ts` files under the matching domain folder. Keep prior suites green.
Assertions target real DTO fields (codes, status, qty, holders, ledger reasons, audit actor/entity).

## Unit (`tests/unit`)

| Domain | Status | Files |
|--------|--------|-------|
| Auth / roles | done | `auth/roles.test.ts` |
| Shared codes | done | `shared/codes.test.ts` |
| Assets (prefix) | done | `assets/asset-category.test.ts` |
| Purchase orders (parsers) | done | `purchase-orders/po-helpers.test.ts` |
| Purchase orders (cash/receipt FSM) | done | `purchase-orders/po-disbursement.test.ts` |
| Custody / stock markers | done | `custody/stock-void-markers.test.ts` |
| Audit events | done | `audit/audit-events.test.ts` |

## Integration (`tests/integration`) — needs `DATABASE_URL_TEST`

| Domain | Status | Files / notes |
|--------|--------|---------------|
| Auth | partial | `auth/role-home.test.ts` (helper only; Supabase login e2e todo) |
| Categories / departments / suppliers | done | CRUD + code/status fields |
| Users | partial | profile list/update/deactivate (no Supabase Auth createUser) |
| Assets | done | codes, lifecycle oldest=`created`, maintenance flag/resolve, in-custody |
| Inventory | done | opening lot `Initial stock`, adjust/issue ledger qty+reason |
| Requests (admin) | done | qty edit on approve, rejectionReason; **approve→release** in `approve-release.test.ts`; **release→return** (condition/custody/lifecycle/maint) in `borrow-return.test.ts`; **reservedQty undo/cancel** in `consumable-reserve-undo.test.ts` |
| Requests (requester) | done | assignable assignee, cancel reason, `quantityRequested`; requester cancel-after-approve frees reserve |
| Purchase orders | done | delivery intake (asset/supply), project materials dual-credit, multi-dept, status flows; receipt lock/close unit helpers in `po-disbursement.test.ts` |
| Custody / issue history | done | holder/borrow log fields, void restores lot remaining |
| Vouchers / petty cash | done | legacy CRUD + PO-linked exclusive claim; **disbursed→receipt→completed** (+ FSM guards) in `receipt-close.test.ts` |
| Projects | done | milestones, material refund restock qty, asset assign/return status |
| Maintenance | done | resolve → active, technician, openOnly |
| Audit | done | actor/entity/action/notes/entityId (PO number) |

## Quality gate

```bash
npm run check   # lint:gate + typecheck + test + build
```
