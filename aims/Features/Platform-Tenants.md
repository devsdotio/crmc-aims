# Platform / tenants (superadmin)

## Wired surfaces

| Layer | Path |
|-------|------|
| UI | `/platform`, `/platform/tenants` |
| Components | `src/components/tenant/*` + platform pages (inline fetch) |
| Server | API routes under `src/app/api/platform/**` (gated `requireSuperAdmin`) |

## APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/platform/tenants` |
| POST | `/api/platform/tenants/onboard` |
| POST | `/api/platform/switch-tenant` |
| GET | `/api/platform/metrics` |

See [[Auth/Multi-Tenant]] for context resolution and default tenant constants.
