# Multi-tenant (as implemented)

Primary files:
- `src/server/db/schema/tenants.ts`
- `src/server/shared/tenant-context.ts`
- `src/server/shared/tenant-query.ts`
- `src/lib/tenant/resolve-request-tenant.ts`
- `src/app/api/platform/**`

## `tenants` table

| Column | Type / notes |
|--------|----------------|
| `id` | uuid PK |
| `slug` | unique text |
| `name` | text |
| `branding` | jsonb |
| `settings` | jsonb |
| `createdAt`, `updatedAt` | timestamps |

## Default tenant (code constants)

- id: `00000000-0000-0000-0000-000000000001`
- slug: `crmc`
- name: `Cebu Roosevelt Memorial Colleges`

## Context resolution order

From `tenant-context.ts`:

1. Active async-local / execution context
2. Headers `x-tenant-id` / `x-tenant-slug`
3. Cookie `aims_tenant`
4. Default tenant above

Storage: ALS + Cloudflare ExecutionContext WeakMap + Node fallback.

## Query helpers

- `scopeTenant(column, explicit?)` — `eq(column, tenantId)` or `undefined` if no tenant (cross-tenant / platform)
- `withTenant(data, explicit?)` — injects `tenantId` from data / explicit / context / default

## Platform APIs (superadmin)

| Methods | Path |
|---------|------|
| GET, POST | `/api/platform/tenants` |
| POST | `/api/platform/tenants/onboard` |
| POST | `/api/platform/switch-tenant` |
| GET | `/api/platform/metrics` |

UI: `/platform`, `/platform/tenants`.

Migrations of note: `0032_multi_tenant_migration`, `0033_tenant_rls_policies` (among 48 SQL files).
