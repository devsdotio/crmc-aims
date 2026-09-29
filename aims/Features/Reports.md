# Reports

## Wired surfaces

| Layer | Path |
|-------|------|
| UI | `/reports` + subroutes + `/reports/print` |
| Layout | `(private)/reports/layout.tsx`, `report-layout-nav.tsx` |
| Components | `src/components/reports/*` |
| Client | `src/features/reports/*` |
| Server | `src/server/modules/reports/` |

## Key APIs

| Methods | Path |
|---------|------|
| GET | `/api/reports/summary` |
| GET | `/api/reports/assets`, `/api/reports/assets/:assetId` |
| GET | `/api/reports/consumables`, `departments`, `maintenance`, `projects`, `purchase-orders`, `requests` |
| GET | `/api/reports/export` |
| POST | `/api/reports/print-intent` |

## Gap

Report nav omits `/reports/requests` and `/reports/purchase-orders` even though those **pages and APIs exist**.
