# Pages & navigation (from App Router + sidebar)

Route groups `(private)` / `(public)` do **not** appear in the URL.  
Nav source of truth: `src/components/sidebar.tsx`.

## Public

| Path | Notes |
|------|-------|
| `/` | Role redirect (`src/app/page.tsx`) |
| `/sign-in` | `SignInForm` |
| `/forgot-password` | forgot-password UI |
| `/api/docs` | Swagger UI page |

## Staff / shared private

| Path | Notes |
|------|-------|
| `/dashboard` | Staff dashboard |
| `/assets` | `AssetsView` |
| `/consumables` | Inventory root |
| `/consumables/supplies`, `/materials` | Typed inventory |
| `/borrow-requests` | → `/borrow-requests/assign` |
| `/borrow-requests/assign`, `/borrow`, `/supplies` | Request kinds |
| `/consumable-requests` | → supplies |
| `/purchase-orders` (+ scopes) | See [[Features/Purchase-Orders]] |
| `/disbursements` | → vouchers |
| `/disbursements/vouchers`, `/petty-cash` | Disbursement UIs |
| `/vouchers`, `/petty-cash` | Redirect aliases |
| `/suppliers`, `/projects` | CRUD UIs |
| `/borrow-log`, `/issue-history`, `/maintenance-logs` | Logs |
| `/audit-logs`, `/audit-trails` | Same page (alias) |
| `/reports/**`, `/reports/print` | Reports |
| `/users`, `/categories`, `/departments` | Admin |
| `/profile`; `/settings` → profile | Account |
| `/platform`, `/platform/tenants` | Superadmin |

## Borrower

See [[Features/Borrower-Portal]].

## Layouts present

`src/app/layout.tsx`, `(private)/layout.tsx`, `(private)/dashboard/layout.tsx`, `(private)/borrower-db/layout.tsx`, `(private)/reports/layout.tsx`, `(private)/issue-history/layout.tsx`
