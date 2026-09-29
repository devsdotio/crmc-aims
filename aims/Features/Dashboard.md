# Dashboard

## Wired surfaces

| Layer | Path |
|-------|------|
| Staff UI | `/dashboard` (+ `dashboard/layout.tsx`) |
| Components | `src/components/dashboard/*` |
| Client | `src/features/dashboard/*` |
| Server | `src/server/modules/dashboard/` |
| Schema | `dashboardMetricSnapshots` |

## Capabilities (service)

- Sidebar summary
- Borrower / staff snapshots
- Notifications
- Deltas / charts (assets, stock volume, top categories)

## Key APIs

| Methods | Path |
|---------|------|
| GET | `/api/dashboard` |
| GET | `/api/dashboard/assets`, `.../stock-volume`, `.../top-categories` |

## Gap

Quick actions in UI link to `/assets/new` and `/consumables/restock` — **no matching pages** exist (see [[Ops/Known-Gaps]]).

`features/dashboard/actions.ts` stub — unused.
