/**
 * Application roles — source of truth for authz helpers and Zod enums.
 * Must match `app_role` PostgreSQL enum in profiles schema.
 */
export const APP_ROLES = [
  "superadmin",
  "admin",
  "staff",
  "borrower",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const PROFILE_STATUSES = ["active", "deactivated"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

/** Hierarchy for “minimum role” checks (higher = more privilege). */
export const ROLE_RANK: Record<AppRole, number> = {
  borrower: 10,
  staff: 20,
  admin: 30,
  superadmin: 40,
};

/** Roles allowed into the staff operations shell (`(private)` dashboard). */
export const STAFF_SHELL_ROLES: readonly AppRole[] = [
  "superadmin",
  "admin",
  "staff",
] as const;

/** Roles that may manage user accounts. */
export const USER_MANAGER_ROLES: readonly AppRole[] = [
  "superadmin",
  "admin",
] as const;

/**
 * Roles that may approve, release, restock, and otherwise mutate assets/inventory.
 * Staff may browse operator pages read-only this phase; they are not operators.
 */
export const ASSET_OPERATOR_ROLES: readonly AppRole[] = [
  "superadmin",
  "admin",
] as const;

/**
 * Roles an actor may assign when creating/updating users.
 * superadmin is never assignable via API — only seed/script.
 */
export function assignableRolesFor(actorRole: AppRole): AppRole[] {
  if (actorRole === "superadmin") {
    return ["admin", "staff", "borrower"];
  }
  if (actorRole === "admin") {
    return ["staff", "borrower"];
  }
  return [];
}

export function hasMinRole(role: AppRole, minimum: AppRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isStaffShellRole(role: AppRole): boolean {
  return (STAFF_SHELL_ROLES as readonly string[]).includes(role);
}

export function isUserManagerRole(role: AppRole): boolean {
  return (USER_MANAGER_ROLES as readonly string[]).includes(role);
}

export function isAssetOperatorRole(role: AppRole): boolean {
  return (ASSET_OPERATOR_ROLES as readonly string[]).includes(role);
}
