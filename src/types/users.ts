import type { BaseFilterState } from "./filters";

export type UserRole = "superadmin" | "admin" | "staff" | "borrower";

export type UserStatus = "active" | "deactivated";

export interface RoleDefinition {
  title: string;
  description: string;
  badgeStyle: "filled" | "outlined" | "muted";
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  departmentId: string | null;
  departmentCode: string | null;
  dateAdded: string;
  lastActive: string;
  activitySummary?: string;
}

export interface UserFilterState extends BaseFilterState {
  role: string;
  status: string;
  tenantId?: string;
}
