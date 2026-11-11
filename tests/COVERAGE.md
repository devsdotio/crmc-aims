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


## Requester Portal, Classification & Authz Additions
- Unit: `tests/unit/consumables/consumable-classification.test.ts` (`deriveConsumableRequestKind`, `splitByConsumableClassification`, supply/material/mixed derivation)
- Unit: `tests/unit/consumables/issue-movement-helpers.test.ts` (`combineIssueMovementNotes`, `stockMovementToDTO` classification & `requestCode` mapping)
- Unit: `tests/unit/borrower-db/browse-availability.test.ts` (out-of-stock requestability for supplies & materials)
- Unit: `tests/unit/borrower-db/map-portal-request.test.ts` (portal kind mapping, mixed labels, empty-items guard)
- Unit: `tests/unit/requests/requester-authz.test.ts` (borrower dept lock, owner & admin pending edits, non-owner/staff edit block)
- Unit: `tests/unit/reports/report-service.test.ts` (split supply/material summary & cost masking, CSV columns & print/export audit logs)
- Unit: `tests/unit/reports/report-classification-ui.test.ts` (badge normalization, nav omission of Requisitions tab, 2-part Consumables & separated Executive/Procurement/Individual prints)
- Unit: `tests/unit/custom-reports/dataset-registry.test.ts` (`consumable-requests` dataset, normalized `supply`/`material`/`mixed` filters, `runtimeFiltersSchema` clears, filter summary labels)
- Integration: `tests/integration/requests/supplies-materials-edit.test.ts` (`?classification=supply|material|mixed` filter, pending edit permissions against PostgreSQL)
- Integration: `tests/integration/purchase-orders/lot-release-issue.test.ts` (lot-cost release/issue, combined movement notes, `Departments` report direct inventory issue aggregation & void exclusion)
- Integration: `tests/integration/reports/reports-consumables-separation.test.ts` (end-to-end Supply vs Material separation across Executive, Consumables, POs, Requests, Departments, Projects & void exclusion)
- Integration: `tests/integration/custom-reports/datasets.test.ts` (`executeDatasetQuery` separation across `consumables`, `stock-movements`, `purchase-orders`, and `consumable-requests`)
