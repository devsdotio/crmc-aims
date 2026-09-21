import type { AppRole } from "@/server/shared/roles";

export interface GuardConfig {
  allowedRoles: AppRole[];
  /**
   * Override when role is not allowed (default: role-aware home).
   * @default home for the signed-in role
   */
  fallbackRoute?: string;
}
