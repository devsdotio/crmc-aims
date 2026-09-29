# Borrow / assignment requests

## Wired surfaces

| Layer | Path |
|-------|------|
| Staff UI | `/borrow-requests` → redirects to `/borrow-requests/assign`; also `/borrow`, `/supplies` |
| Components | `src/components/borrow-requests/*` (`BorrowRequestsPage` with `kind`) |
| Client | `src/features/borrow-requests/*` |
| Server | `src/server/modules/borrow-requests/` |
| Schema | `borrowRequests` (+ related custody via borrow-log) |

## Request kinds (UI)

- `assign` — assignment requests
- `borrow` — borrowable asset requests
- `supply` — staff view of supply requests (consumable-requests domain; see [[Features/Consumable-Requests]])

## Workflow statuses

`pending` → `approved` / `rejected` / `cancelled` → `released` → `unreleased` / `returned`

Also: `undo-approval` path exists as API action.

## Key APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/requests` |
| GET, PATCH | `/api/requests/:id` |
| POST | `/api/requests/:id/approve`, `reject`, `cancel`, `release`, `unrelease`, `return`, `undo-approval` |

## Note

`src/features/borrow-requests/actions.ts` stub — unused. Live path is `/api/requests`.
