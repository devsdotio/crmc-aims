# Stack (as installed & used)

## Runtime package versions (`package.json`)

| Layer | Packages |
|-------|----------|
| App | `next@16.3.5`, `react@19.2.4`, `react-dom@19.2.4` |
| ORM / DB | `drizzle-orm@0.45.2`, `postgres@3.4.9`, `drizzle-kit` (dev) |
| Auth | `@supabase/ssr@0.12.3`, `@supabase/supabase-js@2.110.9` |
| Client cache | `@tanstack/react-query@5.101.4` |
| Forms/validation | `zod@4.4.3` |
| UI | `tailwindcss@4`, `@base-ui/react`, `shadcn`, `lucide-react`, `framer-motion`, `recharts`, `tw-animate-css` |
| QR / print | `qrcode`, `qrcode.react`, `jspdf`, `html2canvas` |
| Deploy | `@opennextjs/cloudflare`, `wrangler` |
| OpenAPI UI | `next-swagger-doc`, `swagger-ui-react` |

## Key config files

| File | Role |
|------|------|
| `next.config.ts` | Next config |
| `drizzle.config.ts` | Drizzle Kit (also duplicate under `src/server/db/drizzle.config.ts`) |
| `wrangler.jsonc` | Cloudflare Workers / Hyperdrive / env |
| `open-next.config.ts` | OpenNext Cloudflare adapter |
| `netlify.toml` | Build env only (not primary deploy path) |
| `components.json` | shadcn (base-nova) |
| `tsconfig.json` | Path aliases (`@/*` → `src/*`) |
| `src/proxy.ts` | Next 16 network boundary (session refresh / auth gate) |

## What is *not* in this repo

- No separate backend service / PHP (`composer.json` absent)
- No Prisma
- No Playwright browser e2e yet (Vitest unit + DB integration under `tests/`)

## npm scripts (live)

```
dev, build, start, lint, typecheck, test, test:unit, test:integration, test:watch, check
preview, deploy, upload, cf:deploy, cf-typegen
db:generate, db:migrate, db:migrate:verbose, db:inspect, db:repair, db:studio
seed:superadmin
```
