import type { UserRole, RoleDefinition } from "@/types/users";

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  superadmin: {
    title: "Superadmin",
    description: "Developer access — full system control and admin provisioning. Not for day-to-day campus ops.",
    badgeStyle: "filled",
  },
  admin: {
    title: "Admin",
    description: "Full access — manage users/roles, all approve/reject actions, all data entry, system settings.",
    badgeStyle: "filled",
  },
  staff: {
    title: "Staff",
    description:
      "Browse-only access to assets, inventory, and request queues. Property custodian actions are limited to administrators.",
    badgeStyle: "outlined",
  },
  borrower: {
    title: "Department account",
    description:
      "Shared login for one department — request borrowable, assignable, and consumable items on behalf of that office.",
    badgeStyle: "muted",
  },
};

export const INVITABLE_ROLES: UserRole[] = ["admin", "staff", "borrower"];

/** Roles that may approve, release, restock, and mutate assets/inventory (matches server). */
export const ASSET_OPERATOR_ROLES: readonly UserRole[] = [
  "superadmin",
  "admin",
] as const;

export function isAssetOperatorRole(role: UserRole | undefined): boolean {
  return role != null && (ASSET_OPERATOR_ROLES as readonly string[]).includes(role);
}
