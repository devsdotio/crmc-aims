# CRMC-AIMS — Working-Code System Audit

> **Purpose:** Accurate briefing of what the system currently is and what works, based only on running application code and `db.sql` / Drizzle schema.  
> **Generated from:** source under `src/`, `db.sql`, `package.json`, route handlers, services.  
> **Explicitly ignored:** README, vault notes, and other descriptive markdown (except this file).  
> **Audience:** engineers / other AIs that must not invent features that are not wired.

---

## 1. What this product is

**CRMC-AIMS** (Cebu Roosevelt Memorial Colleges — Asset & Inventory Management System) is a multi-tenant web app for campus property custodianship:

- Track **coded capital assets** (QR-tagged units) and their custody (borrow vs long-term assignment).
- Manage **consumable inventory** (supplies/materials) with costed purchase lots and stock movements.
- Run **approval queues** for asset borrows and consumable requisitions (department “borrower” accounts).
- Track **projects** with expenses, materials checkout, asset assignments, and progress indicators.
- Record **purchase orders / lots**, **suppliers**, **disbursement vouchers**, and **petty cash**.
- Provide **maintenance**, **custody logs**, **issue history**, **reports** (Beta), and **platform tenant onboarding** for superadmins.

It is **not** a generic ERP, accounting package, or public self-service signup portal. Users are provisioned by admins (Supabase Auth + `profiles` row).

---

## 2. Tech stack (as implemented)

| Layer | Choice |
|--------|--------|
| Framework | **Next.js 16.2** App Router (`src/app`) |
| UI | React 19, Tailwind 4, shadcn/`@base-ui/react`, lucide, framer-motion, recharts |
| Auth | **Supabase Auth** (`@supabase/ssr`, `@supabase/supabase-js`) |
| DB | **Supabase Postgres** via **Drizzle ORM** + `postgres` driver |
| Client data | **TanStack React Query 5** → `/api/*` Route Handlers |
| Validation | Zod 4 |
| Other | QR (`qrcode` / `qrcode.react`), Swagger UI (`/api/docs`), uuid |

**Path alias:** `@/*` → `./src/*`

**Env (from `.env.example`):**
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; invite/create users)
- `NEXT_PUBLIC_SITE_URL` (optional)

**Scripts:** `dev`, `build`, `start`, `lint`, `db:generate|migrate|inspect|repair|studio`, `seed:superadmin`

**Network boundary:** `src/proxy.ts` (Next 16) replaces classic `middleware.ts` — refreshes Supabase session, sets `x-pathname` / tenant headers, redirects unauthenticated users.

---

## 3. High-level architecture

```
Browser (App Router pages + React Query)
    │
    ▼
/api/* Route Handlers  (primary backend surface; ~111 route.ts files)
    │
    ▼
server/modules/<domain>/
    controller → service → repository
    │
    ▼
Drizzle → Postgres (tenant-scoped rows via tenant_id)

Auth: Supabase session cookies (+ optional Bearer JWT for Swagger/API)
Authz: profiles.role + profiles.tenant_id + helpers in server/shared/roles.ts & auth.ts
```

**Server Actions (`"use server"`):** only three files exist; most are legacy/unused:
- `src/features/borrow-requests/actions.ts` — `submitBorrowRequest()` throws **"Not implemented"** (UI uses API client instead)
- `src/features/consumables/actions.ts`
- `src/features/dashboard/actions.ts`

**Do not treat Server Actions as the main API.** Prefer `/api/*`.

### Source layout

```
src/
├── app/                 # pages + api route handlers
├── components/          # UI by domain + shell (sidebar, dashboard-layout)
├── constants/           # roles, asset statuses, categories helpers
├── features/            # client APIs, React Query hooks, query keys
├── hooks/               # use-asset-operator, use-borrower-realtime-sync
├── lib/                 # supabase clients, tenant resolve, utils, QR helpers
├── server/
│   ├── db/schema/       # Drizzle tables (source of truth with db.sql dump)
│   ├── db/migrations/   # SQL migrations
│   ├── modules/         # domain services
│   └── shared/          # auth, roles, tenant-context, errors, sandbox, codes, qr
└── types/               # shared TS types
```

Backend module pattern (typical): `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.validation.ts`, `*.types.ts`, `index.ts`.

---

## 4. Multi-tenancy

- Table `tenants` (`id`, `slug`, `name`, `branding`, `settings`).
- Almost every business table has `tenant_id` (default CRMC UUID `00000000-0000-0000-0000-000000000001`).
- **Non-superadmin** actors are forced to `profile.tenantId`.
- **Superadmin** may be cross-tenant (`isCrossTenant`); tenant resolution order: headers → cookie `aims_tenant` → subdomain → default tenant.
- `POST /api/platform/switch-tenant` sets the cookie (superadmin only).
- **Gap:** `TenantSwitcher` component exists but is **not mounted** in the UI shell; switching is API/cookie only.

---

## 5. Roles & access model

Postgres enum `app_role` / `APP_ROLES`:

| Role | Rank | Intended use |
|------|------|----------------|
| `superadmin` | 40 | Platform/tenants/user governance. Seeded only — **not assignable via normal user API**. |
| `admin` | 30 | Full tenant ops + mutations (asset operator) + user management |
| `staff` | 20 | Staff shell **browse**; most write APIs blocked by `requireAssetOperator` |
| `borrower` | 10 | Shared **department account** → `/borrower-db/*` (+ `/profile`) only |

Profile status: `active` | `deactivated`.

### Privilege helpers (`src/server/shared/roles.ts`)

- **Staff shell:** superadmin, admin, staff
- **User managers:** superadmin, admin
- **Asset operators (mutations):** superadmin, admin only — **staff is not an operator this phase**
- **Assignable roles:** superadmin → admin/staff/borrower; admin → staff/borrower

### Layout gates (`src/app/(private)/layout.tsx`)

| Role | Allowed |
|------|---------|
| borrower | `/borrower-db/*`, `/profile` only |
| superadmin | Platform routes; **redirected away** from `/dashboard` and borrower portal → `/platform/tenants` |
| admin / staff | Ops shell; redirected away from `/borrower-db` and `/platform` |

Root `/` redirects: borrower → `/borrower-db/dashboard`; superadmin → `/platform`; else → `/dashboard`.

`RouteGuard` is used mainly on `borrower-db/layout.tsx` (`allowedRoles: ['borrower']`). Elsewhere: layout + API auth helpers.

### Sidebar visibility (from `src/components/sidebar.tsx`)

| Section | Route | Roles |
|---------|-------|-------|
| Platform | `/platform`, `/platform/tenants`, `/users` | superadmin |
| Overview | `/dashboard` | admin, staff |
| Overview | `/borrower-db/dashboard` | borrower |
| Operations | `/assets`, `/consumables`, `/borrow-requests`, `/purchase-orders/*`, `/disbursements/*`, `/suppliers` | admin, staff |
| Operations | `/projects` | **admin only** (not staff) |
| Operations | `/borrower-db/requests`, `/borrower-db/inventory` | borrower |
| Logs | `/borrow-log`, `/issue-history`, `/maintenance-logs` | admin, staff |
| Logs | `/borrower-db/history` | borrower |
| Admin | `/reports` (badge **Beta**) | admin, staff |
| Admin | `/users`, `/categories`, `/departments` | admin |

**Not in sidebar:** `/audit-logs`, `/settings`, `/borrower-db/requisition` (reachable by URL), `/consumable-requests` (redirect).

---

## 6. Authentication flows

| Concern | Location |
|---------|----------|
| Browser Supabase client | `src/lib/supabase/client.ts` |
| Server Supabase client | `src/lib/supabase/server.ts` |
| Service role admin | `src/lib/supabase/admin.ts` |
| Session refresh | `src/lib/supabase/update-session.ts` via `src/proxy.ts` |
| Actor context | `src/server/shared/auth.ts` (`requireActor`, profile cache, Bearer support) |
| Sign-in / out / token / me | `/api/auth/*`, `/api/me`, `/api/me/password` |
| UI | `(public)/sign-in`, `(public)/forgot-password`, `components/auth/*` |
| Remember-me | `src/lib/auth/remember-me.ts` |

**Public paths (proxy allowlist):** `/sign-in`, `/forgot-password`; APIs `/api/health`, `/api/docs`, `/api/docs/spec`, `/api/auth/sign-in`, `/api/auth/token`, `/api/bible-verse`.

**Rules:**
- No public self-registration; users created via admin invite / platform onboard / seed script.
- Actor identity always from session/JWT — never trust client-supplied user ids for authz.
- Deactivated profiles cannot enter private layout.

---

## 7. Database inventory (current schema)

Source: `db.sql` + `src/server/db/schema/*`. Tables:

| Table | Purpose |
|-------|---------|
| `tenants` | Institutions |
| `profiles` | App users linked to Supabase `user_id` |
| `departments` | Org units; optional sandbox |
| `categories` | Taxonomy names (`type` = asset \| consumable) |
| `locations` | **Schema only — unused by services/UI** (free-text location used instead) |
| `asset_models` | Product catalog for multi-unit equipment |
| `assets` | One row per physical QR unit |
| `asset_lifecycle_events` | Append-only asset event ledger |
| `requests` | Asset borrow/assignment approval queue |
| `borrow_transactions` | Custody ledger (issued units) |
| `consumables` | On-hand inventory items |
| `consumable_requests` | Multi-line supply requisitions |
| `consumable_request_lines` | Lines on a supply request |
| `consumable_request_release_allocations` | Lot cost allocation at release |
| `stock_movements` | Consumable qty ledger |
| `purchase_lots` | Costed receipts / PO lines |
| `suppliers` | Vendor registry |
| `maintenance_logs` | Repair work orders |
| `projects` | Custodian work units |
| `project_expense_lines` | Project spend ledger |
| `project_asset_assignments` | Assets assigned to projects |
| `project_progress_indicators` | Project checklist milestones |
| `vouchers` | Disbursement / transfer / liquidation vouchers |
| `petty_cash_vouchers` | Petty cash (PCV) |
| `audit_logs` | Generic audit trail |
| `dashboard_metric_snapshots` | Daily metric snapshots for dashboard deltas |

Sandbox flags exist on `assets`, `asset_models`, `consumables`, `departments` (`is_sandbox`). Hidden unless superadmin opts in (`includeSandbox` / sidebar toggle).

---

## 8. Domain modules — capabilities & workflows

### 8.1 Assets (coded equipment)

**Purpose:** Physical capital units with unique `asset_code` / QR. Custody is **not** invented on create; release/return go through borrow-log (or project assignment).

**Key paths:**
- Service: `src/server/modules/assets/asset.service.ts`
- UI: `/assets`, `src/components/assets/*`
- APIs: `/api/assets/**`, `/api/assets/scan/**`

**Status enum:** `active | needs_repair | out_of_service | retired | missing`  
**Assignment type:** `borrowable` (due-dated) | `assignable` (open-ended) — **not** “permanent”.

**Important rules:**
- Available = `active`, no holder, no open project assignment, no active borrow.
- Column `reserved_for_request_id` exists and is cleared on some paths but **never set** anywhere (reservation unfinished).
- `maintenance_history` JSONB is effectively unused (always empty in DTO); real history = maintenance logs + lifecycle events.
- UI compounds like “Available / In Custody” are **display-only**.

**UI supports:** list (grid/table), filters, detail (QR + lifecycle), create/edit/delete, Issue (release), Flag maintenance, text Scan, print.  
**Not wired in UI despite API/dialogs:** Report Missing (dialog exists, not mounted), dedicated Return button (return mainly via scan / borrow-log), asset-models catalog UI, bulk create UI.

**Scan/QR:**
- Encode prefixes: `CRMC-AIMS:`, `A:`, `ASSET:` (assets); lots use `CRMC-AIMS-LOT:` / `LOT:` / `L:`.
- `resolve` suggests: project / return / release / blocked.
- Scan UI is **text lookup**, not camera.

---

### 8.2 Asset models (catalog)

**Purpose:** Product template for N identical units (defaults for assignment type, location, value, image).

**APIs work:** `GET/POST /api/asset-models`, `GET/PATCH/DELETE /api/asset-models/[id]`, `GET/POST .../units`, plus `POST /api/assets/bulk`.  
**UI:** **none**. Assets page creates single units without a model catalog screen.

---

### 8.3 Borrow requests (asset request queue)

**Table:** `requests`  
**Purpose:** Approval queue only — **does not transfer custody**. Custody happens on **release** via `BorrowLogService`.

**Kinds:** `borrowable` (due date required) | `assignable` (open-ended).

**State machine:**
```
pending ──approve──► approved ──release──► released ──(return)──► returned
   │                    │  │
   │                    │  └──undoApproval──► pending
   │                    └──unrelease──► unreleased
   ├──reject──► rejected
   └──cancel──► cancelled  (also from approved)
```

**Create rule:** request items normalized to **category-only** (specific asset IDs stripped at create); operators allocate concrete units at release.

**APIs:** `/api/requests`, `/api/requests/[id]`, `approve|reject|cancel|undo-approval|release|unrelease|return`.

**UI:**
- Staff: `/borrow-requests` (tabs, approve/reject/undo/release/return/edit).
- Borrower: create wizard + my requests + cancel under `/borrower-db/*`.
- **Mark unreleased:** handlers/API exist; **no button** bound in UI. No dedicated `unreleased` tab.

---

### 8.4 Borrow log / custody (`borrow_transactions`)

**Purpose:** One row per issued unit. Sets/clears `assets.current_holder`, writes lifecycle events, may open maintenance / mark missing.

**Status:** `active | returned | voided` (DTO also derives `overdue` when due < today).  
**custody_kind:** `borrow | assignment`  
**source:** `portal | admin_manual | project_legacy`  
**return_condition:** `good | damaged | needs_repair | lost | stolen`

**Rules:**
- Destination: `departmentId` XOR `projectId`.
- Borrow requires due date; assignment type must match kind.
- Return damaged/needs_repair → often `needs_repair` + MNT log; lost/stolen → `missing`.
- Void blocked for `source=portal`; hard-delete is superadmin-only.
- List defaults to **borrow** kind unless `assignment|all` requested.

**UI `/borrow-log`:** active/overdue/returned(+voided); return dialog uses `good|damaged|needs_repair` (no lost/stolen in that dialog); void non-portal. Direct release UX is primarily from **Assets**, not this page.

---

### 8.5 Maintenance logs

**Purpose:** First-class repair work orders; keeps asset `needs_repair` ↔ `active` in sync.

**Condition:** `good | needs_maintenance | damaged | resolved`  
**Source:** `return_checkout | manual_flag | project_assignment`  
**Flow:** open → `resolve` (no reopen). Resolving last open log on a `needs_repair` asset returns it to `active`.

**Cannot flag** assets that are in custody, or `retired`/`missing`.

**UI:** `/maintenance-logs` + Flag dialog on assets; resolve with notes/technician/cost/parts.

---

### 8.6 Asset lifecycle events

Append-only accountability. Types: `created | updated | status_changed | released | returned | flagged_maintenance | deleted`.  
API: `GET /api/assets/[id]/lifecycle`. No global list route. Written by asset/borrow-log/project/maintenance services.

---

### 8.7 Consumables (inventory)

**Purpose:** On-hand stock. Mutations go through lots + `stock_movements` (legacy JSONB `history` unused).

**Classification:** `supply | material` (`src/lib/consumable-classification.ts`).  
**Computed stock severity:** healthy / low (≤1.2× min) / critical (≤ min).  
**Available qty:** `max(0, currentQty - reservedQty)`.

**Ops:**
| Op | Behavior |
|----|----------|
| restock | qty↑, new lot, MOV in/restock |
| issue / checkout | explicit lot consume, qty↓, MOV out/issue; project dest may write project expense |
| adjust | signed delta + lot sync |
| scan release from lot | issue from specific lot |

**UI `/consumables`:** list, filters, detail (lots + movements), add/edit, adjust, issue, delete.  
**Gap:** `RestockDialog` exists but is **never mounted**; restock API lives; intake mainly via PO deliver / create-with-stock / adjust-up. Location is **free-text**, not `locations` FK.

---

### 8.8 Consumable requests (supply requisitions)

**Purpose:** Multi-line supply requests. Stock **not** deducted until release; **approval reserves** `reservedQty`.

**Status:** `pending → approved | rejected | cancelled`; `approved → released | cancelled | undo→pending`.

**Staff UI:** merged into `/borrow-requests?kind=supply` (`/consumable-requests` redirects there).  
**Borrower UI:** request + track; full-page slip at `/borrower-db/requisition`.

**Release:** admin picks **explicit lots** per line (not automatic FIFO); writes MOVs + `consumable_request_release_allocations`.  
**Gap:** project-destination **request release does not** mirror walk-up issue’s automatic project expense write.

---

### 8.9 Stock movements & Issue History

**Purpose:** Ledger of consumable qty changes. Reasons: `restock | issue | adjust`; direction `in | out`.

**Void:** `POST /api/stock-movements/[id]/void` — only `out/issue`, restores lot remaining + qty, compensating restock MOV, removes linked project expense when applicable. Soft-void markers in notes.

**UI:** `/issue-history` — filter, detail, void mistaken issues, export affordances. Distinct from Custody Log (`/borrow-log`).

---

### 8.10 Purchase lots / Purchase Orders

**Purpose:** Costed receipts and PO workflow. Each line is a `purchase_lots` row with `quantity_remaining` for costing.

**Item type:** `consumable | asset`.  
**PO status (stored in notes JSON metadata — not a first-class DB enum):**  
`pending_approval → approved → ordered → delivered | cancelled`  
Server does **not** hard-enforce sequential transitions; first transition **into** `delivered` triggers stock intake (consumable restock or asset activation).

**FIFO:** `consumeFifo` used for adjust-down / some costed paths; walk-up issue and request release use **explicit lot** selection.

**UI:** `/purchase-orders` (all), `/purchase-orders/asset`, `/purchase-orders/consumables`, `/purchase-orders/projects` — same `PurchaseOrdersView` with `categoryScope`. File PO, status changes, receipts, QR, lot scan release.

**Also:** `POST /api/purchase-lots/receipt/upload`, `GET .../by-code`, `POST .../scan/release`.

---

### 8.11 Suppliers

**Purpose:** Vendor registry. Soft-deactivate only (`active | inactive`). Codes `SUP-…`.  
**UI:** `/suppliers`. Required active when attaching to new lots via `recordLot`.

---

### 8.12 Vouchers & Petty cash

**Vouchers** (`/disbursements/vouchers`, `/vouchers` redirects):
- Types: `disbursement | property_transfer | liquidation`
- Status (UI path): `draft → pending_approval → approved → completed | cancelled`
- Codes: `DRR{year}-`, `PTR{year}-`, `LQD{year}-`
- One active (non-cancelled) voucher **or** petty-cash per PO number

**Petty cash** (`/disbursements/petty-cash`):
- Same status path; codes `PCV{year}-######`
- Category string (UI constrains: supplies, transportation, meals, etc.)

**Gap:** UI enforces workflow; **service accepts any status** on PATCH without a strict transition graph. Create flow is disbursement-centric; other types labeled but less complete.

---

### 8.13 Projects

**Purpose:** Custodian work units (renovation/construction, etc.) with budget, expenses, asset custody (no borrower account), progress indicators.

**Project status:** `draft | active | on_hold | completed | cancelled` — **completed = read-only** (no reopen in code).

**Sub-features:**
- **Expenses:** types `miscellaneous | adjustment | consumable | material | asset_writeoff`; categories include travel/snacks/labor/broken_asset/fees/adjustment/etc.
- **Materials:** checkout consumables into project (stock + expense).
- **Asset assignments:** `assigned → returned | written_off`; damage path → maintenance vs write-off + expense.
- **Progress indicators:** checklist (`is_completed`, order_index, dates).

**Auth:** most project APIs `requireUserManager` (admin/superadmin). **Indicators** routes use weaker `requireActor` only.  
**Sidebar:** admin only (staff has no Projects nav). Superadmin has API access but is redirected out of normal ops shell.

**UI:** `/projects` — table + detail (expenses, materials, assets, progress, print).

---

### 8.14 Categories & Departments

**Categories** (`/categories`, admin): `type=asset|consumable` name taxonomy. Rename **cascades** to assets/models/maintenance/borrow/consumables by name match. Delete blocked if usages > 0. Implemented largely in repository/routes (thin service layer).

**Departments** (`/departments`, admin): unique code+name; `isSandbox`; delete blocked if linked profile; rename syncs profile department text.

**Locations:** table exists; **no module, no API, no UI**.

---

### 8.15 Users & profile

**Users** (`/users`): invite/create, edit, deactivate/reactivate (`requireUserManager`). Rules: no self-mutate via admin APIs; admin can’t manage other admins; tenant isolation; superadmin can filter by institution.

**Profile** (`/profile`): self name/password; superadmin sandbox toggle.  
**`/settings` → redirects to `/profile`.** Settings system/backup/export components appear orphaned (not mounted).

---

### 8.16 Dashboard

**Staff** `/dashboard`: stats, stock volume chart, top categories, pending POs/deliveries, activity; badges for pending/low-stock/overdue via sidebar counts.  
**Borrower** `/borrower-db/dashboard`: personal/dept snapshot + realtime sync.  
**Snapshots:** `dashboard_metric_snapshots` used for historical metric lookbacks/deltas.  
APIs: `/api/dashboard`, `/dashboard/assets`, `/stock-volume`, `/top-categories` (`scope=sidebar|full`).

---

### 8.17 Reports (Beta)

**Gate:** staff shell; **cost/valuation fields** only for asset operators (admin/superadmin). Staff see counts/status without valuation.

**UI tabs:** Overview, Assets, Consumables, Projects, Departments, Maintenance.  
Also pages for purchase-orders & requests (linked from overview KPIs, not always in primary tab strip). Print: `/reports/print`; asset drilldown `/reports/assets/[assetId]`. Export API: `/api/reports/export`.

---

### 8.18 Audit logs

**APIs exist:** `/api/audit-logs`, plus flattened `/api/audit-logs/{borrow-requests|purchase-orders|requisitions}`.  
**UI:** `/audit-logs` **redirects to `/platform`** — no dedicated staff audit UI; not in sidebar.

---

### 8.19 Platform (superadmin)

- `/platform` — metrics (`/api/platform/metrics`)
- `/platform/tenants` — list + onboard (`/api/platform/tenants`, `/tenants/onboard`)
- Onboard: create tenant + Supabase auth user + admin profile + starter departments/categories
- Switch tenant cookie API (no mounted switcher UI)

---

### 8.20 Borrower portal (`/borrower-db`)

| Path | Function |
|------|----------|
| `/borrower-db` | Browse catalog |
| `/borrower-db/dashboard` | Stats + pending + realtime |
| `/borrower-db/requests` | Track borrow + supply requests |
| `/borrower-db/inventory` | Department inventory view |
| `/borrower-db/history` | Past custody |
| `/borrower-db/requisition` | Full-page requisition slip |

Realtime: `useBorrowerRealtimeSync` listens to `requests`, `consumable_requests`, `borrow_transactions` and invalidates React Query caches. Vouchers/petty-cash client hooks also subscribe to their tables.

---

## 9. End-to-end workflows (how pieces link)

### A. Asset borrow (portal)

```
Borrower creates request (category lines, pending)
  → Admin approves (optional qty edits) — does NOT reserve specific units
  → Admin releases (picks concrete assets matching category + assignment type)
       → borrow_transactions (active, source=portal)
       → assets.current_holder set + lifecycle released
       → request status = released
  → Return (per log or request-level)
       → condition may open maintenance / mark missing
       → request → returned when all linked logs closed
```

### B. Direct admin issue (walk-up)

```
Assets page Issue / scan release
  → BorrowLogService.release (source=admin_manual)
  → active custody to dept XOR project
```

### C. Project asset custody

```
Projects → assign asset
  → project_asset_assignments (assigned)
  → may interact with borrow log / holder
  → return or damage (maintenance vs write-off + expense)
```

### D. Consumable supply request

```
Create multi-line request (pending)
  → Approve → reservedQty ↑ on each consumable
  → Release → admin allocates lots exactly; reservedQty ↓; qty ↓; MOVs; allocation rows
  → Reject/cancel/undo reverse reservation as appropriate
```

### E. Walk-up consumable issue

```
Consumables Issue (or lot scan release)
  → explicit lot → qty ↓ → MOV out/issue
  → if project dest → project_expense_lines (consumable)  [unlike request release]
```

### F. Purchase order deliver

```
Create PO lines (purchase_lots, status pending_approval…)
  → status transitions in UI
  → delivered → restock consumable OR activate/create asset side effects
  → optional voucher/PCV claims PO number exclusively
```

### G. Maintenance

```
Flag (asset free) OR return damaged OR project damage
  → maintenance_logs open + asset needs_repair
  → resolve (technician, notes, cost, parts)
  → last open log clears → asset active
```

---

## 10. API surface (grouped)

Auth/me: `/api/auth/{sign-in,sign-out,token,me}`, `/api/me`, `/api/me/password`  
Health/docs: `/api/health`, `/api/docs`, `/api/docs/spec`, `/api/bible-verse`  
Platform: `/api/platform/{metrics,switch-tenant,tenants,tenants/onboard}`  
Assets: `/api/assets`, `/next-code`, `/bulk`, `/by-code`, `/[id]`, `/release`, `/return`, `/flag-maintenance`, `/report-missing`, `/lifecycle`, `/scan/{resolve,release,return}`  
Models: `/api/asset-models`, `/[id]`, `/[id]/units`  
Requests: `/api/requests`, `/[id]`, `/approve|reject|cancel|undo-approval|release|unrelease|return`  
Borrow-log: `/api/borrow-log`, `/[id]`, `/return`, `/void`  
Consumables: `/api/consumables`, `/[id]`, `/restock|issue|checkout|adjust|movements`  
Consumable-requests: `/api/consumable-requests`, `/[id]`, `/approve|reject|cancel|undo-approval|release`  
Stock: `/api/stock-movements`, `/[id]/void`  
Purchase-lots: `/api/purchase-lots`, `/[id]`, `/status`, `/by-code`, `/receipt/upload`, `/scan/release`  
Suppliers, categories, departments, users: standard CRUD under `/api/{resource}`  
Projects: `/api/projects`, `/[id]`, `/expenses`, `/expenses/batch-materials`, `/materials`, `/assets`, `/assets/[assignmentId]/{return,damage}`, `/indicators`, `/indicators/[indicatorId]`  
Maintenance: `/api/maintenance-logs`, `/[id]`, `/resolve`  
Dashboard: `/api/dashboard`, `/assets`, `/stock-volume`, `/top-categories`  
Reports: `/api/reports/{summary,assets,assets/[assetId],consumables,departments,maintenance,projects,purchase-orders,requests,export}`  
Audit: `/api/audit-logs`, `/borrow-requests`, `/purchase-orders`, `/requisitions`  
Finance: `/api/vouchers`, `/next-code`, `/[id]`, `/[id]/status`; `/api/petty-cash` same pattern  

---

## 11. Code generation / operational codes (patterns in use)

Examples seen in services (not exhaustive): asset codes `{PREFIX}-{NNN}`, request `REQ…`, borrow log codes, maintenance `MNT…`, stock `MOV…`, suppliers `SUP…`, vouchers `DRR/PTR/LQD{year}-…`, petty cash `PCV{year}-…`, lot codes / PO numbers. Unique collisions often retry with sequence peeking.

---

## 12. Known gaps / incomplete wiring (code evidence)

Treat these as **not fully productized**, even if schema/API pieces exist:

1. **`reserved_for_request_id` never set** — asset reservation on approve unfinished.
2. **Asset-models** — full backend, **no UI**.
3. **Report Missing** — API + dialog; **not mounted** on assets page.
4. **Mark unreleased** — API + handlers; **no UI button**.
5. **`locations` table** — unused; free-text locations only.
6. **`RestockDialog` orphaned** — restock via PO/create/adjust instead.
7. **`/settings` and `/audit-logs`** — redirects only; settings backup/export UI orphaned.
8. **`TenantSwitcher`** — implemented, not imported into shell.
9. **PO status in notes JSON** — fragile vs first-class column/enum; weak server transition guards.
10. **Voucher/petty status** — UI workflow, weak server transition validation.
11. **Supply request → project** — no project expense on release (unlike walk-up issue).
12. **Scan** — text only; no camera/`BarcodeDetector`.
13. **`features/borrow-requests/actions.ts`** — still throws Not implemented.
14. **Project indicators** — weaker auth (`requireActor`) than rest of projects.
15. **Completed projects** — cannot reopen.
16. **Superadmin** — cannot use normal `/dashboard` ops shell (forced to platform).
17. **Staff** — can browse operator pages; most mutations blocked by operator role checks.
18. **Reports** — marked Beta; some KPI deltas decorative/static.

---

## 13. Enum quick reference (Postgres / Drizzle)

| Enum | Values |
|------|--------|
| `app_role` | superadmin, admin, staff, borrower |
| `profile_status` | active, deactivated |
| `asset_status` | active, needs_repair, out_of_service, retired, missing |
| `asset_assignment_type` | borrowable, assignable |
| `asset_request_type` | borrowable, assignable |
| `borrow_request_status` | pending, approved, rejected, released, unreleased, returned, cancelled |
| `custody_kind` | borrow, assignment |
| `custody_source` | portal, admin_manual, project_legacy |
| `borrow_transaction_status` | active, returned, voided |
| `return_condition` | good, damaged, needs_repair, lost, stolen |
| `consumable_request_status` | pending, approved, rejected, released, cancelled |
| `consumable_request_source` | portal, admin_manual |
| `stock_movement_direction` | in, out |
| `stock_movement_reason` | restock, issue, adjust |
| `purchase_lot_item_type` | consumable, asset |
| `maintenance_condition` | good, needs_maintenance, damaged, resolved |
| `maintenance_source` | return_checkout, manual_flag, project_assignment |
| `project_status` | draft, active, on_hold, completed, cancelled |
| `project_asset_assignment_status` | assigned, returned, written_off |
| `project_expense_line_type` | miscellaneous, adjustment, consumable, material, asset_writeoff |
| `supplier_status` | active, inactive |
| `voucher_type` | disbursement, property_transfer, liquidation |
| `voucher_status` / `petty_cash_status` | draft, pending_approval, approved, completed, cancelled |
| `asset_lifecycle_event_type` | created, updated, status_changed, released, returned, flagged_maintenance, deleted |

Note: legacy `asset_category` / `consumable_category` enums exist for Drizzle history; **runtime categories** live in `categories` table and are stored as text on items.

---

## 14. Role × capability matrix (practical)

| Capability | superadmin | admin | staff | borrower |
|------------|:----------:|:-----:|:-----:|:--------:|
| Platform / tenants | ✓ | ✗ | ✗ | ✗ |
| Ops dashboard shell | redirected | ✓ | ✓ | ✗ |
| Browse assets/inventory/requests/PO/logs | shell blocked | ✓ | ✓ | ✗ |
| Mutate assets/inventory/approve/release | API yes* | ✓ | ✗ | ✗ |
| Projects UI | shell blocked | ✓ | ✗ nav | ✗ |
| Users / categories / departments | ✓ (governance) | ✓ | ✗ | ✗ |
| Reports (Beta) | shell blocked | ✓ + costs | ✓ no costs | ✗ |
| Borrower portal | ✗ | ✗ | ✗ | ✓ |
| Profile | ✓ | ✓ | ✓ | ✓ |

\*Superadmin can call many APIs cross-tenant but UI forces platform home.

---

## 15. How to extend safely (for another AI)

1. Prefer **Route Handler → module service → repository → Drizzle** over new Server Actions.
2. Always thread **`tenant_id`** and use `requireActor` / `requireAssetOperator` / `requireUserManager` / `requireSuperAdmin` as appropriate.
3. Do not invent reservation behavior until `reserved_for_request_id` is written on approve and respected in availability.
4. Do not assume `locations` CRUD exists.
5. Custody truth = **`borrow_transactions` + project_asset_assignments`**, not request status alone.
6. Stock truth = **`consumables.current_qty` + `reserved_qty` + `purchase_lots.quantity_remaining` + `stock_movements`**.
7. Match existing UI patterns in `src/components/<domain>` and React Query hooks in `src/features/<domain>/client`.
8. Respect layout height / Tailwind `@theme` conventions in `src/app/globals.css` if touching UI (project coding rules).
9. After schema changes: update Drizzle schema + migrations; keep `db.sql` as reference dump only (not executable as-is).

---

## 16. Page map (working routes)

### Public
- `/sign-in`, `/forgot-password`

### Staff / admin ops
- `/dashboard`
- `/assets`, `/consumables`, `/borrow-requests`
- `/purchase-orders`, `/purchase-orders/asset`, `/purchase-orders/assets` (alias), `/purchase-orders/consumables`, `/purchase-orders/projects`
- `/disbursements/vouchers`, `/disbursements/petty-cash` (also `/vouchers`, `/petty-cash` aliases as implemented)
- `/suppliers`, `/projects`
- `/borrow-log`, `/issue-history`, `/maintenance-logs`
- `/reports` (+ `/reports/assets`, `/[assetId]`, `/consumables`, `/projects`, `/departments`, `/maintenance`, `/purchase-orders`, `/requests`, `/print`)
- `/users`, `/categories`, `/departments`, `/profile`

### Borrower
- `/borrower-db`, `/borrower-db/dashboard`, `/requests`, `/inventory`, `/history`, `/requisition`

### Superadmin
- `/platform`, `/platform/tenants`, `/users` (governance)

### Redirects (not real UIs)
- `/settings` → `/profile`
- `/audit-logs` → `/platform`
- `/consumable-requests` → `/borrow-requests?kind=supply`

### API docs UI
- `/api/docs` (Swagger)

---

*End of working-code audit. Prefer this document over older narrative docs when they conflict.*
