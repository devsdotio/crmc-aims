# Directory map (working tree)

Only folders that participate in the running app or ops scripts.

| Path | Purpose |
|------|---------|
| `src/app/` | App Router: `page.tsx`, layouts, `api/**/route.ts` |
| `src/components/` | Feature UI + shared shell + `ui/` (shadcn) |
| `src/features/` | Client API hooks / query keys (and unused action stubs) |
| `src/server/db/` | Drizzle client, schema, SQL migrations |
| `src/server/modules/` | Domain controllers / services / repositories |
| `src/server/shared/` | Auth, roles, tenant, cache, HTTP, QR, storage helpers |
| `src/lib/` | Supabase clients, session update, tenant resolve, utils, swagger |
| `src/hooks/`, `src/constants/`, `src/types/` | Shared client helpers / DTOs |
| `src/proxy.ts` | Auth/session network proxy |
| `public/` | Static assets (logos, Quicksand fonts) |
| `scripts/` | Migrate/inspect/repair, seed superadmin, CF deploy, one-off e2e scripts |

## Build / editor / non-app

| Path | Notes |
|------|-------|
| `docs/`, `README.md`, `SYSTEM-AUDIT.md` | Documentation — **not** used as product truth for this vault |
| `aims/` | This Obsidian vault |
| `db.sql` | Standalone SQL dump; **not** the Drizzle migrate pipeline |
| `.next/`, `.open-next/`, `.wrangler/`, `node_modules/` | Artifacts |
| `.agent/`, `.cursor/`, `.vscode/` | Editor / agent config |

## Entrypoints

**Frontend**
- `src/app/layout.tsx` — root providers + Quicksand
- `src/app/page.tsx` — role redirect
- `src/app/(private)/layout.tsx` + `src/components/dashboard-layout.tsx` — authenticated shell
- `src/proxy.ts` → `src/lib/supabase/update-session.ts`

**Backend**
- `src/app/api/**/route.ts` (118 handlers)
- Domain logic in `src/server/modules/*`
- DB: `src/server/db/index.ts` (`DATABASE_URL` locally; Hyperdrive on Workers)
