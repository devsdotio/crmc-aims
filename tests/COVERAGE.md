# Test coverage map

Append new `*.test.ts` files under the matching domain folder. Keep prior suites green.

## Unit (`tests/unit`)

| Domain | Status | Files |
|--------|--------|-------|
| Auth / roles | done | `auth/roles.test.ts` |
| Shared codes | done | `shared/codes.test.ts` |
| Assets (prefix) | done | `assets/asset-category.test.ts` |
| Purchase orders (parsers) | done | `purchase-orders/po-helpers.test.ts` |
| Custody / stock markers | done | `custody/stock-void-markers.test.ts` |
| Audit events | done | `audit/audit-events.test.ts` |

## Integration (`tests/integration`) — needs `DATABASE_URL_TEST`

| Domain | Status | Files / notes |
|--------|--------|---------------|
| Auth | partial | `auth/role-home.test.ts` (helper only; Supabase login e2e todo) |
| Assets | done | `assets/asset-codes.test.ts` |
| Inventory | done | `inventory/opening-lot.test.ts` |
| Purchase orders | done | `purchase-orders/po-delivery-intake.test.ts` |
| Requests | done | `requests/approve-reject.test.ts` |
| Custody | done | `custody/release-return-void.test.ts` |
| Audit | done | `audit/audit-injection.test.ts` |
| Categories / departments / suppliers | todo | CRUD + cascade |
| Users | todo | Admin CRUD department accounts |
| Vouchers / petty cash | todo | Legacy + PO-linked flows |
| Projects | todo | Milestones, materials refund/restock, asset assign/remove |
| Maintenance | todo | Flag in/out of custody, resolve |

## Quality gate

```bash
npm run check   # lint:gate + typecheck + test + build
```
