# Roles and access (from code)

Primary files:
- `src/server/shared/roles.ts`
- `src/server/shared/auth.ts`
- `src/app/(private)/layout.tsx`
- `src/components/sidebar.tsx`

## Roles

| Role | Rank | Meaning in code |
|------|-----:|-----------------|
| `borrower` | 10 | Department portal only |
| `staff` | 20 | Staff shell browse; **not** asset operator this phase |
| `admin` | 30 | Tenant admin + asset operator + user manager |
| `superadmin` | 40 | Platform; seeded only; not assignable via API |

## Profile status

`active` | `deactivated`

## Role sets

| Set | Members | Used for |
|-----|---------|----------|
| `STAFF_SHELL_ROLES` | superadmin, admin, staff | Private staff dashboard shell |
| `USER_MANAGER_ROLES` | superadmin, admin | Create/update users |
| `ASSET_OPERATOR_ROLES` | superadmin, admin | Approve / release / restock mutations |

## Assignable roles

- Actor `superadmin` → may assign `admin`, `staff`, `borrower`
- Actor `admin` → may assign `staff`, `borrower`
- `superadmin` is never assignable through the API

## Auth helpers (`auth.ts`)

Identity from Supabase JWT `getClaims()`; profile row in `profiles` (role is **not** taken from client body).

Helpers in use: `requireAuth`, `requireRoles`, `requireMinRole`, `requireStaffShell`, `requireUserManager`, `requireAssetOperator`, `requireSuperAdmin`, `requireTenantAdmin`.

## Sidebar by role (source: `sidebar.tsx`)

### superadmin
- Platform Overview `/platform`
- Institutions & Tenants `/platform/tenants`
- User Governance `/users`

### admin
- **Overview:** Dashboard
- **Operations:** Assets; Inventory (Supplies, Materials); Requests (Assign, Borrow, Supplies); Purchase Orders (Asset, Supplies, Materials, Projects); Disbursements (Vouchers, Petty Cash); Suppliers; Projects
- **Logs:** Custody Log, Issue History, Maintenance Logs, Audit Trails
- **Admin:** Reports, Users, Categories, Departments

### staff
Same as admin **minus** Projects, Users, Categories, Departments.

### borrower
- Dashboard `/borrower-db/dashboard`
- Requests: Assign, Borrow, Supplies
- Operations: Inventory, Supplies, Materials
- History: Borrow History

All roles: Profile & Settings `/profile`; Log out.
