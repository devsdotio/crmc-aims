# Tests

Vitest suite for CRMC-AIMS. Prefer **service-level** tests with a fabricated actor (no Supabase JWT).

## Layout

```
tests/
  setup/           # env, db reset, actor, fixtures
  unit/            # pure helpers — always run
  integration/     # real Postgres via DATABASE_URL_TEST
  COVERAGE.md      # checklist ↔ files
```

New feature → add `tests/{unit|integration}/<domain>/<feature>.test.ts`.

## Environment

1. Create a **dedicated** wipeable Postgres (never production).
2. Set in `.env.local` (or shell):

```env
DATABASE_URL_TEST=postgresql://USER:PASS@HOST:5432/crmc_aims_test
```

3. Bootstrap the test database from the **current schema** (not historical SQL — those migrations assume old prod table names and are unsafe to replay on a blank DB):

```bash
npm run db:migrate:test
```

That runs `drizzle-kit push` against `DATABASE_URL_TEST` only. App/prod still uses `npm run db:migrate`.

Integration suites **skip** when `DATABASE_URL_TEST` is unset **or** its hostname
does not resolve from this machine. Unit suites always run.

### Troubleshooting: `getaddrinfo ENOTFOUND db.*.supabase.co`

Direct Supabase DB hosts are often **IPv6-only**. Node on Windows then fails DNS
even when `nslookup` shows an AAAA record — you get 25 identical TRUNCATE errors.

**Fix:** use the **Session pooler** connection string from Supabase
(Database settings → Connection string → *Session mode* / pooler). The host looks
like `aws-0-<region>.pooler.supabase.com` and usually has IPv4.

```env
# Prefer pooler (IPv4) over db.<ref>.supabase.co
DATABASE_URL_TEST=postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Then re-push schema and re-run:

```bash
npm run db:migrate:test
npm run test:integration
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run test:unit` | Pure unit tests |
| `npm run test:integration` | DB-backed suites |
| `npm run test` | All tests |
| `npm run test:watch` | Watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint:gate` | ESLint for server/lib/tests |
| `npm run check` | lint:gate + typecheck + test + build (pre-merge / pre-deploy) |

## Isolation

`resetTestDatabase()` truncates business tables and reseeds the default CRMC tenant. Fixtures add department, categories, profile, and supplier per test.
