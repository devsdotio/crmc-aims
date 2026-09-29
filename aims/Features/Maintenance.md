# Maintenance logs

## Wired surfaces

| Layer | Path |
|-------|------|
| UI | `/maintenance-logs` → `MaintenanceLogsView` |
| Client | `src/features/maintenance-logs/*` |
| Server | `src/server/modules/maintenance/` |
| Schema | `maintenanceLogs` |

## Capabilities

- List / create / update open logs
- Resolve
- `sync-orphans` for assets in `needs_repair` without logs
- Flag while borrowed/assigned — custody stays; assignee snapshotted on the log

## Key APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/maintenance-logs` |
| GET, PATCH | `/api/maintenance-logs/:id` |
| POST | `/api/maintenance-logs/:id/resolve`, `.../sync-orphans` |

Tied to asset flag-maintenance / `needs_repair` status. In-custody assets may be flagged; `assignedToName` records who held the unit at flag time.
