# API catalog (118 `route.ts` handlers)

All under `src/app/api/**/route.ts`. Domain logic in `src/server/modules/*`.

## Auth / me / health / docs / misc

| Methods | Path |
|---------|------|
| GET | `/api/auth/me` |
| POST | `/api/auth/sign-in`, `/api/auth/sign-out`, `/api/auth/token` |
| GET, PATCH | `/api/me` |
| POST | `/api/me/password` |
| GET | `/api/health` |
| GET | `/api/docs/spec` |
| GET | `/api/bible-verse` |

Public allowlist: health, docs(+spec), auth sign-in/token, bible-verse.

## Assets / models

| Methods | Path |
|---------|------|
| GET, POST | `/api/assets` |
| GET, PATCH, DELETE | `/api/assets/:id` |
| POST | `/api/assets/bulk` |
| GET | `/api/assets/by-code`, `/api/assets/next-code` |
| POST | `/api/assets/:id/release`, `return`, `report-missing`, `flag-maintenance` |
| GET | `/api/assets/:id/lifecycle` |
| POST | `/api/assets/scan/release`, `resolve`, `return` |
| GET, POST | `/api/asset-models` |
| GET, PATCH, DELETE | `/api/asset-models/:id` |
| GET, POST | `/api/asset-models/:id/units` |

## Requests / consumable requests / borrow-log

| Methods | Path |
|---------|------|
| GET, POST | `/api/requests` |
| GET, PATCH | `/api/requests/:id` |
| POST | `/api/requests/:id/approve`, `reject`, `cancel`, `release`, `unrelease`, `return`, `undo-approval` |
| GET, POST | `/api/consumable-requests` |
| GET, PATCH | `/api/consumable-requests/:id` |
| POST | `/api/consumable-requests/:id/approve`, `reject`, `cancel`, `release`, `undo-approval` |
| GET, POST | `/api/borrow-log` |
| GET, DELETE | `/api/borrow-log/:id` |
| POST | `/api/borrow-log/:id/return`, `void` |

## Consumables / stock

| Methods | Path |
|---------|------|
| GET, POST | `/api/consumables` |
| GET, PATCH, DELETE | `/api/consumables/:id` |
| POST | `/api/consumables/:id/adjust`, `checkout`, `issue`, `restock` |
| GET | `/api/consumables/:id/movements` |
| GET | `/api/stock-movements` |
| POST | `/api/stock-movements/:id/void` |

## Purchase lots / suppliers / projects

| Methods | Path |
|---------|------|
| GET, POST | `/api/purchase-lots` |
| GET, PATCH, DELETE | `/api/purchase-lots/:id` |
| POST | `/api/purchase-lots/:id/lines` |
| POST, PATCH | `/api/purchase-lots/:id/status` |
| GET | `/api/purchase-lots/by-code`, `delete-impact` |
| DELETE | `/api/purchase-lots/by-po` |
| POST | `/api/purchase-lots/receipt/upload`, `scan/release` |
| GET, POST | `/api/suppliers` |
| GET, PATCH, DELETE | `/api/suppliers/:id` |
| GET, POST | `/api/projects` |
| GET, PATCH, DELETE | `/api/projects/:id` |
| GET | `/api/projects/progress-summaries` |
| GET, POST | `/api/projects/:id/assets` |
| POST | `/api/projects/:id/assets/:assignmentId/return`, `damage` |
| CRUD-ish | `/api/projects/:id/expenses`, `indicators` (+ indicator id) |
| POST | `/api/projects/:id/expenses/batch-materials`, `materials` |

## Disbursements / maintenance / taxonomy / users / dashboard / reports / audit / platform

| Methods | Path |
|---------|------|
| CRUD + status + next-code | `/api/vouchers`, `/api/petty-cash` |
| GET, POST, PATCH, resolve, sync-orphans | `/api/maintenance-logs` |
| GET, POST, PUT/DELETE | `/api/categories` |
| GET, POST, PATCH, DELETE | `/api/departments` |
| GET, POST, PATCH, DELETE | `/api/users` |
| GET | `/api/dashboard`, `.../assets`, `stock-volume`, `top-categories` |
| GET / POST | `/api/reports/*` (summary, assets, consumables, departments, maintenance, projects, purchase-orders, requests, export, print-intent) |
| GET / POST | `/api/audit-logs` (+ domain views, report-print-intent) |
| GET, POST | `/api/platform/tenants`, onboard, switch-tenant, metrics |

## Server modules (20)

`assets`, `audit-logs`, `auth`, `borrow-log`, `borrow-requests`, `categories`, `consumable-requests`, `consumables`, `dashboard`, `departments`, `disbursements`, `maintenance`, `petty-cash`, `projects`, `purchase-lots`, `reports`, `stock-movements`, `suppliers`, `users`, `vouchers`
