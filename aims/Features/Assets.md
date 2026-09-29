# Assets

## Wired surfaces

| Layer | Path |
|-------|------|
| UI | `src/components/assets/*`, page `/assets` |
| Client | `src/features/assets/*` |
| Server | `src/server/modules/assets/` (`asset.*`, `asset.lifecycle.*`, `asset.model.*`) |
| Schema | `assets`, `assetModels`, `assetLifecycleEvents` |

## Capabilities in code

- CRUD assets; bulk create
- Next code / by-code lookup
- Release, return, report-missing, flag-maintenance
- Lifecycle event ledger
- Asset models + unit registration
- QR scan: resolve / release / return (`/api/assets/scan/*`)

## Key APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/assets` |
| GET, PATCH, DELETE | `/api/assets/:id` |
| POST | `/api/assets/bulk` |
| GET | `/api/assets/by-code`, `/api/assets/next-code` |
| POST | `/api/assets/:id/release`, `.../return`, `.../report-missing`, `.../flag-maintenance` |
| GET | `/api/assets/:id/lifecycle` |
| POST | `/api/assets/scan/release`, `.../resolve`, `.../return` |
| GET, POST | `/api/asset-models` |
| GET, PATCH, DELETE | `/api/asset-models/:id` |
| GET, POST | `/api/asset-models/:id/units` |

## Statuses

See [[Data/Status-Enums]] — `asset_status`, assignment type, lifecycle event types.

## Access

Mutating asset operations gated by `ASSET_OPERATOR_ROLES` (`superadmin`, `admin`). Staff can browse via staff shell.
