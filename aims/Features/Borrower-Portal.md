# Borrower portal

## Shell

- Layout: `src/app/(private)/borrower-db/layout.tsx`
- Root `/borrower-db` redirects to dashboard
- Private layout confines `borrower` role to `/borrower-db/*` and `/profile`

## Pages (wired)

| Path | Renders |
|------|---------|
| `/borrower-db/dashboard` | `BorrowerDashboard` |
| `/borrower-db/inventory` | `DepartmentInventoryView` |
| `/borrower-db/assets` | redirect → inventory |
| `/borrower-db/supplies` | issued consumables (`supply`) |
| `/borrower-db/materials` | issued consumables (`material`) |
| `/borrower-db/requests` | `RequestsPage` `all` |
| `/borrower-db/requests/assignment` | assign |
| `/borrower-db/requests/borrow` | borrow |
| `/borrower-db/requests/supplies` | supplies requests |
| `/borrower-db/history` | `BorrowHistoryTab` |
| `/borrower-db/requisition` | `RequisitionSlip` |

Sidebar for borrower listed in [[Auth/Roles-and-Access]].

Uses same `/api/requests`, `/api/consumable-requests`, dashboard borrower snapshot endpoints, etc., with role/tenant scoping on the server.
