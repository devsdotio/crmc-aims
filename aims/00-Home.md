# CRMC-AIMS — Current System (from working code)

> **Source of truth:** live code under `src/`, `scripts/`, and root configs.  
> **Scanned:** 2026-09-29  
> **Not used as truth:** `docs/`, `README.md`, `SYSTEM-AUDIT.md`, or prior vault notes.

## What this app is

**CRMC-AIMS** (`crmc-aims` v0.1.0) is a **Next.js App Router monolith**: UI pages + `/api/*` route handlers in one repo. It is an asset / inventory / requests / purchase / disbursement system for institutions (multi-tenant), with a separate **borrower portal**.

| Fact | Value (from code) |
|------|-------------------|
| Framework | Next.js **16.3.5**, React **19.2.4**, TypeScript |
| UI | Tailwind 4, shadcn/Base UI, Lucide, Framer Motion, Recharts |
| Data | Drizzle ORM + PostgreSQL (`postgres` driver) |
| Auth | Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) |
| Client data | TanStack React Query 5 |
| Validation | Zod 4 |
| Deploy | OpenNext Cloudflare + Wrangler; Hyperdrive for Postgres |
| API docs UI | Swagger at `/api/docs` (`next-swagger-doc` + `swagger-ui-react`) |

## Counts (repo scan)

| Surface | Count |
|---------|------:|
| `page.tsx` routes | 62 |
| `api/**/route.ts` handlers | 118 |
| Drizzle schema modules | 28 |
| SQL migrations | 48 |
| Server domain modules | 20 |
| App roles | 4 |

## Role homes (root redirect)

From `src/app/page.tsx`:

- no session → `/sign-in`
- `borrower` → `/borrower-db/dashboard`
- `superadmin` → `/platform`
- everyone else (`admin` / `staff`) → `/dashboard`

## Vault map

### Architecture
- [[Architecture/Stack]]
- [[Architecture/Directory-Map]]
- [[Architecture/Request-Flow]]
- [[Architecture/Server-Modules]]

### Auth & tenancy
- [[Auth/Roles-and-Access]]
- [[Auth/Multi-Tenant]]

### Data
- [[Data/Schema]]
- [[Data/Status-Enums]]

### Features (wired in UI + API + server modules)
- [[Features/Assets]]
- [[Features/Consumables]]
- [[Features/Borrow-Requests]]
- [[Features/Consumable-Requests]]
- [[Features/Borrow-Log]]
- [[Features/Purchase-Orders]]
- [[Features/Disbursements]]
- [[Features/Projects]]
- [[Features/Suppliers]]
- [[Features/Maintenance]]
- [[Features/Dashboard]]
- [[Features/Reports]]
- [[Features/Audit-Logs]]
- [[Features/Users-and-Profile]]
- [[Features/Categories-Departments]]
- [[Features/Platform-Tenants]]
- [[Features/Borrower-Portal]]

### Surfaces
- [[Surface/Pages-and-Nav]]
- [[Surface/API-Catalog]]

### Ops
- [[Ops/Scripts-and-Env]]
- [[Ops/Known-Gaps]]

## How mutations work

Almost all writes go through **`/api/*`** + React Query clients under `src/features/*/`.  
Server Actions under `src/features/*/actions.ts` are **stubs that throw** and are **not imported** anywhere — not part of the live path.
