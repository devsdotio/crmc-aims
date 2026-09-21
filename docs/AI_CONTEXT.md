# AI Agent Context

Read this before generating or modifying code in this repo. Also read `PROJECT_OVERVIEW.md`, `ARCHITECTURE.md`, and `DATA_MODEL.md` for full context — this file is the condensed ruleset.

## What This Project Is

A Next.js system for CRMC's Property Custodian to track coded assets (QR-scanned in/out) and consumables (quantity-tracked) as they're borrowed by departments via a public, no-login form. Custodian/assistant staff confirm and release every request.

## Structural Rules (do not deviate)

1. **Feature-based, not DDD.** Business logic lives under `src/features/<feature-name>/`, each with the same internal shape: `components/`, `actions.ts`, `queries.ts`, `schema.ts`, `types.ts`.
2. **`src/app/` is routing and rendering only.** Never put query logic, business rules, or schema definitions directly in a route handler or page — import from the relevant `features/*` module.
3. **New feature = new folder under `features/`** following the existing shape. Don't invent a different internal structure per feature.
4. **`src/components/` is shared UI only** (shadcn primitives, generic layout pieces). Feature-specific components belong inside that feature's own `components/` folder.
5. **Each feature owns its own drizzle schema file**; `src/db/schema.ts` re-exports all of them as the single entry point for drizzle-kit.

## Domain Rules (do not violate)

- **Coded assets vs. consumables are different flows** — see `DATA_MODEL.md`. Don't merge their logic into one generic "item" abstraction that hides this distinction; it's intentional.
- **Nothing is released without custodian/staff confirmation.** Both asset and consumable requests go: submitted → pending → confirmed/released. Never auto-release on submission.
- **Consumable stock is only deducted at release, not at request time.**
- **Borrowers never authenticate.** Don't add a login requirement to the public request form — identity is captured per-submission (name/department/contact).
- **Only custodian/staff authenticate**, via Supabase Auth. Gate the `(admin)` route group; leave `(public)` open.
- **Overdue status is derived, not manually set** — compare `expected_return_at` to the current time when reading, unless told otherwise.

## API Conventions

- Every new route handler under `src/app/api/` gets a `@swagger` JSDoc annotation (see `API_REFERENCE.md` for the format). Don't skip this — it's how the API stays documented.
- Keep the endpoint table in `API_REFERENCE.md` up to date when adding/changing routes.

## When Scaffolding Something New

Work in small, scoped slices — one feature or one route at a time, not the whole system in one pass. If a task spans multiple features (e.g. "borrow request release should update both the request and the asset status"), still implement it feature-by-feature and wire them together explicitly, rather than creating a new cross-cutting abstraction.

## Out of Scope (don't add unless asked)

- Offline support
- Borrower accounts/login
- Dedicated barcode scanner hardware integration (QR via phone camera + manual fallback only)