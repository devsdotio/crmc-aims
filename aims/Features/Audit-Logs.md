# Audit logs

## Wired surfaces

| Layer | Path |
|-------|------|
| UI | `/audit-logs`; sidebar uses `/audit-trails` (re-export of same page) |
| Components | `src/components/audit-logs/*` |
| Client | `src/features/audit-logs/*` |
| Server | `src/server/modules/audit-logs/` (+ `audit-events.ts` `log()`) |
| Schema | `auditLogs` |

## Key APIs

| Methods | Path |
|---------|------|
| GET | `/api/audit-logs` |
| GET | `/api/audit-logs/borrow-requests`, `.../purchase-orders`, `.../requisitions` |
| POST | `/api/audit-logs/report-print-intent` |
