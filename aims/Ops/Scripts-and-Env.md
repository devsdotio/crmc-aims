# Scripts & environment

## npm scripts (`package.json`)

| Script | Purpose |
|--------|---------|
| `dev` | Next dev (IPv4 DNS order) |
| `build` / `start` | Production Next |
| `lint` | ESLint, max-warnings 0 |
| `preview` | OpenNext Cloudflare build + preview |
| `deploy` / `upload` / `cf:deploy` | Cloudflare deploy path |
| `cf-typegen` | Wrangler types → `cloudflare-env.d.ts` |
| `db:generate` | Drizzle Kit generate |
| `db:migrate` | Drizzle Kit migrate |
| `db:migrate:verbose` | `scripts/db-migrate.ts` |
| `db:inspect` / `db:repair` / `db:studio` | DB ops |
| `seed:superadmin` | `scripts/seed-superadmin.ts` |

## Env vars referenced in `src/` + scripts

| Name | Use |
|------|-----|
| `DATABASE_URL` | Local Postgres |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser/server anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client |
| `NODE_ENV` | Environment |
| `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` | Local Hyperdrive / deploy scripts |

Workers runtime binding: `HYPERDRIVE` (not `process.env`).

Present in examples / wrangler but **not** referenced under `src/`: `NEXT_PUBLIC_SITE_URL`, `NEXTJS_ENV`.

## Ops scripts (not a test suite)

Examples under `scripts/`: multi-tenant e2e, profile tests, tenant migration verify, db/assets inspect, CF deploy helper.
