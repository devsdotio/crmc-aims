# CRMC-AIMS — Current System Features, Purpose & Flows

> Snapshot of the system **as designed and implemented today**.  
> Prefer `docs/CLIENT_SYSTEM_OVERVIEW.md` and `docs/ASSET_CLASSIFICATION_AND_REQUEST_FLOWS.md` for client-facing intent. Live code under `src/server/modules/` and `src/app/api/` is the source of truth for behavior.

---

## 1. Purpose

**CRMC-AIMS** (Asset & Inventory Management System) is a web application for the **Property Custodian’s office** at CRMC.

It is meant to:

- Track **coded capital assets** (equipment, AV, furniture, transport) via unique asset codes / QR tags.
- Track **consumable supplies** by quantity and **supplier purchase lots**, with low-stock visibility.
- Let departments **request items** (borrower portal), and let operators **approve, release, return**, and log condition.
- Give custodians a single place for **operations, logs, maintenance, users, and settings**.

**Today’s practical status:** staff and borrower UIs are wired to live REST APIs (assets, borrow/assign requests, supply requisitions, lots, projects, maintenance, users, dashboard). Mutations go through `/api/*` (not feature server-action stubs). Header notifications read live overdue / pending / low-stock alerts.

---

## 2. Who uses it

| Role | How they access | What they do |
|------|-----------------|--------------|
| **superadmin** | Staff app | Bootstrap / full ops + manage other superadmins |
| **admin** | Staff app | Full campus ops: approve/release, inventory, users, projects |
| **staff** | Staff app | Browse ops pages; mutations blocked at API (`requireAssetOperator`) |
| **borrower** | `/borrower-db/*` only | Shared **department** account — submit/cancel own requests |

Auth is Supabase session + Postgres `profiles`. Private layout gates role and active status.

---

## 3. Domain model (conceptual)

Two separate item kinds (deliberately not merged):

1. **Coded assets** — one physical unit, unique code (e.g. `AV-031`), QR, location, holder, operational status; maintenance via `maintenance_logs` + lifecycle events.
2. **Consumables** — quantity products with optional multi-supplier **lots** (unit cost).

Asset assignment types: **borrowable** (short-term due date) vs **assignable** (project / long-term).

Asset statuses: `active` | `needs_repair` | `out_of_service` | `retired` | `missing`.

---

## 4. Main flows (live)

| Flow | Path |
|------|------|
| Borrowable / assignable request | Portal or staff create → approve/reject → release → return |
| Supply requisition | Create → approve (reserves qty) → release from lots |
| Walk-up issue | Admin release / scan without prior request |
| Restock / adjust / direct issue | Consumables + purchase lots |
| Project assign / return / damage / write-off | Projects module |
| Report missing | Assets panel → closes custody, status `missing` |
| Maintenance flag / resolve | Maintenance logs + asset status |

---

## 5. Architecture note

```
UI (App Router) → /api/* controllers → services → Drizzle/Postgres
```

Feature `actions.ts` files may still throw “Not implemented”; production paths use React Query + REST.

---

*Updated to match live API-backed modules (Aug 2026).*
