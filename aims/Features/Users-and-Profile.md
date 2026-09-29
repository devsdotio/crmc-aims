# Users & profile

## Wired surfaces

| Layer | Path |
|-------|------|
| Users UI | `/users` (admin + superadmin User Governance) |
| Profile | `/profile` (`AccountSection`); `/settings` → redirect to profile |
| Components | `src/components/users/*`, `settings/*` |
| Client | `src/features/users/*` |
| Server | `src/server/modules/users/`, `auth/` |
| Schema | `profiles` |

## Auth APIs

| Methods | Path |
|---------|------|
| GET | `/api/auth/me` |
| POST | `/api/auth/sign-in`, `sign-out`, `token` |
| GET, PATCH | `/api/me` |
| POST | `/api/me/password` |

## User admin APIs

| Methods | Path |
|---------|------|
| GET, POST | `/api/users` |
| PATCH, DELETE | `/api/users/:id` |

User manager roles: `superadmin`, `admin`. Assignable roles per [[Auth/Roles-and-Access]].
