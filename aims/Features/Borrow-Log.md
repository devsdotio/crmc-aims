# Borrow log (custody)

## Wired surfaces

| Layer | Path |
|-------|------|
| UI | `/borrow-log` (large page + `src/components/borrow-log/*`) |
| Client | `src/features/borrow-log/*` |
| Server | `src/server/modules/borrow-log/` |
| Schema | `borrowTransactions` |

## Capabilities

- List custody transactions
- Return / void
- Hard delete
- Overdue counts (service)

## Key APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/borrow-log` |
| GET, DELETE | `/api/borrow-log/:id` |
| POST | `/api/borrow-log/:id/return`, `.../void` |

Transaction statuses: `active` | `returned` | `voided`.
