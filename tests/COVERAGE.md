# Test coverage map

Append new `*.test.ts` files under the matching domain folder. Keep prior suites green.
Refine assertions later for field-level accuracy; this pass is broad checklist coverage.

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
| Categories / departments / suppliers | done | `categories-departments-suppliers/crud.test.ts` |
| Users | partial | `users/accounts.test.ts` (profile seed; no Supabase Auth createUser) |
| Assets | done | `assets/asset-codes.test.ts`, `assets/lifecycle-maintenance.test.ts` |
| Inventory | done | `inventory/opening-lot.test.ts`, adjust/issue in lifecycle-maintenance |
| Requests (admin) | done | `requests/approve-reject.test.ts` |
| Requests (requester) | done | `requests/requester-and-po-flows.test.ts` |
| Purchase orders | done | `purchase-orders/po-delivery-intake.test.ts`, status/multi-dept in requester-and-po-flows |
| Custody / issue history | done | `custody/release-return-void.test.ts` |
| Vouchers / petty cash | done | `projects/project-flows.test.ts` (voucher/PCV block) |
| Projects | done | `projects/project-flows.test.ts` (milestones, material refund, asset assign) |
| Maintenance | done | flag/resolve + in-custody in `assets/lifecycle-maintenance.test.ts` |
| Audit | done | `audit/audit-injection.test.ts` (+ PO cancel audit in requester-and-po-flows) |

## Quality gate

```bash
npm run check   # lint:gate + typecheck + test + build
```
