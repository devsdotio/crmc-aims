# Architecture

## Structural Approach: Feature-Based, Not DDD

This project uses a **feature-based (vertical slice)** structure rather than full Domain-Driven Design.

Why: DDD's layering (entities, value objects, repository interfaces, separate domain/application/infrastructure layers) pays for itself in large systems with many bounded contexts and complex business rules. This system has four core capabilities — assets, consumables, borrow requests, dashboard — with straightforward logic and a small team. Feature-based structure gives the same core benefit (each capability is self-contained, easy to scale by adding new features, easy to hand a single slice to a dev partner or AI agent) without the abstraction overhead.

**The rule:** `app/` is routing and rendering only. It never contains business logic — it imports from `features/*`. Each folder under `features/` is a vertical slice containing everything that capability needs: components, server actions, DB queries, schema, and types.

## Folder Structure

```
crmc-aims/
├── docs/                     # this directory
├── src/
│   ├── app/                  # Next.js App Router — routes/pages only
│   │   ├── (public)/
│   │   │   └── request/      # public borrow/request form
│   │   ├── (admin)/
│   │   │   ├── dashboard/
│   │   │   ├── assets/
│   │   │   ├── consumables/
│   │   │   └── requests/
│   │   └── api/
│   │       ├── assets/
│   │       ├── consumables/
│   │       ├── requests/
│   │       └── docs/         # swagger UI + spec route
│   ├── features/             # business logic, grouped by capability
│   │   ├── assets/
│   │   │   ├── components/
│   │   │   ├── actions.ts    # server actions / mutations
│   │   │   ├── queries.ts    # drizzle reads
│   │   │   ├── schema.ts     # drizzle table definitions
│   │   │   └── types.ts
│   │   ├── consumables/      # same shape as assets/
│   │   ├── borrow-requests/  # same shape as assets/
│   │   └── dashboard/        # same shape as assets/
│   ├── db/
│   │   ├── index.ts          # drizzle client instance
│   │   ├── schema.ts         # re-exports all feature schemas, combined
│   │   └── migrations/       # drizzle-kit output
│   ├── lib/
│   │   ├── supabase/         # server + browser Supabase clients
│   │   └── utils.ts
│   ├── components/           # shared shadcn/ui primitives ONLY — no feature logic
│   └── types/                # types shared across more than one feature
├── drizzle.config.ts
└── package.json
```

## Conventions

- **Route handlers stay thin.** An `app/api/assets/route.ts` handler validates input, calls a function from `features/assets/actions.ts` or `queries.ts`, and returns the response. It does not contain query logic itself.
- **Each feature owns its schema.** `features/assets/schema.ts` defines the `assets` table; `db/schema.ts` re-exports all of them so drizzle-kit has one entry point for migrations.
- **Shared UI only in `components/`.** If a component is specific to one feature (e.g. an asset condition picker), it lives in that feature's `components/` folder, not the shared one.
- **Route groups `(public)` and `(admin)`** separate borrower-facing pages from staff-facing pages at the routing level, so auth middleware can gate `(admin)` cleanly.
- **New feature = new folder under `features/`,** following the same internal shape (`components/`, `actions.ts`, `queries.ts`, `schema.ts`, `types.ts`). This is the pattern to hand to an AI coding agent when scaffolding something new.

## Auth Notes

- Only custodian/staff authenticate, via Supabase Auth (`@supabase/ssr` for server-side session handling).
- Borrowers never log in — the public request form collects name/department/contact per submission and writes directly to `borrow_requests`.
- `(admin)` route group should be protected by middleware checking for a valid Supabase session; `(public)` stays open.