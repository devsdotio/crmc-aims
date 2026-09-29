# Server modules map

All under `src/server/modules/`. Typical pattern: controller → service → repository (some fold controller into `index.ts`).

| Module | Key pieces | Responsibility |
|--------|------------|----------------|
| `assets` | `asset.*`, `asset.lifecycle.*`, `asset.model.*` | Asset CRUD/scan/release/return/flag; lifecycle ledger; models + bulk units |
| `audit-logs` | controller/service/repository, `audit-events.ts` | List critical audits; `log()` writer |
| `auth` | controller/service | signIn, token, signOut, me |
| `borrow-log` | controller/service/repository | Custody list/release/return/void/delete; overdue |
| `borrow-requests` | controller/service/repository | Create + approve/reject/release/cancel/undo/return/unrelease |
| `categories` | `category.repository.ts` only | listByType, listWithCounts, updateAndCascade |
| `consumable-requests` | controller/service/repository | Portal/admin supply request workflow |
| `consumables` | controller/service/repository | Stock CRUD; adjust/checkout/issue/restock; releaseFromLot |
| `dashboard` | controller + `dashboard.service.ts` | Snapshots, charts, notifications |
| `departments` | controller/service/repository | Department CRUD |
| `disbursements` | `disbursement-departments.ts` | Voucher / petty-cash department link helpers |
| `maintenance` | controller/service/repository | Logs + resolve + sync orphans |
| `petty-cash` | controller/service/repository | PCV codes, CRUD, status |
| `projects` | project + expense + asset + progress services | Full project domain |
| `purchase-lots` | service/repo + po-departments/disbursement/delete-impact | PO lifecycle + FIFO |
| `reports` | controller/service/repository | Executive + domain reports + CSV export |
| `stock-movements` | controller/service/repository | Record/list/void issue movements |
| `suppliers` | controller/service/repository | List/create/update/deactivate |
| `users` | controller/service/`ProfileRepository` | User admin + me/password |
| `vouchers` | controller/service/repository | Voucher codes, CRUD, status |

Shared cross-cutting: `src/server/shared/` (auth, roles, tenant, cache, http, errors, security, storage, qr, codes, sandbox, linked-requests, custody-labels).
