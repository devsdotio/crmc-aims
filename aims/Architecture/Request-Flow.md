# Request flow (as coded)

## Browser → API

```
Browser UI (page / dialog)
  → React Query hook in src/features/<domain>/
  → fetch /api/<resource>
  → src/app/api/.../route.ts
  → src/server/modules/<domain> controller
  → service → repository
  → Drizzle (tenant-scoped where applicable)
```

## Auth gate order

1. **`src/proxy.ts`** — refresh Supabase session; redirect unauthenticated users away from private UI; allowlisted public APIs.
2. **`(private)/layout.tsx`** — require profile; enforce role shells:
   - borrower confined to `/borrower-db/*` (+ `/profile`)
   - superadmin bounced off staff dashboard / borrower portal toward `/platform`
   - staff blocked from `/platform` and borrower portal
3. **API handlers** — `requireAuth` / `requireRoles` / `requireAssetOperator` / etc. in `src/server/shared/auth.ts`
4. Optional client **`RouteGuard`** (`src/components/guards/RouteGuard.tsx`)

## Public API allowlist

From `src/lib/supabase/update-session.ts`:

- `/api/health`
- `/api/docs`, `/api/docs/spec`
- `/api/auth/sign-in`, `/api/auth/token`
- `/api/bible-verse`

## Server Actions

Files like `src/features/consumables/actions.ts`, `borrow-requests/actions.ts`, `dashboard/actions.ts` export stubs that throw `"Not implemented"`. **Zero imports** in the app — live mutations are REST-only.
