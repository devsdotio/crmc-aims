import type { ProfileRow } from "@/server/db/schema";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { isUniqueViolation } from "@/server/db/transaction";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/shared/errors";
import type { ActorContext } from "@/server/shared/auth";
import { invalidateProfileCache } from "@/server/shared/auth";
import {
  assignableRolesFor,
  type AppRole,
} from "@/server/shared/roles";
import { DepartmentRepository } from "@/server/modules/departments/department.repository";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";

import { ProfileRepository } from "./user.repository";
import type {
  CreateUserInput,
  IProfileRepository,
  ListUsersFilters,
  ProfileDTO,
  ProfileWithDepartment,
  UpdateUserInput,
} from "./user.types";
import {
  changePasswordSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateMeSchema,
  updateUserSchema,
  userIdSchema,
} from "./user.validation";

function toDateString(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function toProfileDTO(row: ProfileWithDepartment): ProfileDTO {
  const lastActiveAt = row.lastActiveAt ?? null;
  const departmentName = row.linkedDepartmentName ?? row.department;

  return {
    id: row.userId,
    email: row.email,
    name: row.fullName,
    role: row.role,
    status: row.status,
    department: departmentName,
    departmentId: row.departmentId ?? null,
    departmentCode: row.linkedDepartmentCode ?? null,
    tenantId: row.tenantId ?? null,
    dateAdded: toDateString(row.createdAt),
    lastActive:
      row.status === "deactivated"
        ? lastActiveAt
          ? `Deactivated · last seen ${formatRelativeTime(lastActiveAt)}`
          : "Deactivated"
        : formatRelativeTime(lastActiveAt),
    lastActiveAt: lastActiveAt
      ? lastActiveAt instanceof Date
        ? lastActiveAt.toISOString()
        : String(lastActiveAt)
      : null,
    createdByUserId: row.createdByUserId,
  };
}

function assertCanAssignRole(actor: ActorContext, targetRole: AppRole) {
  const allowed = assignableRolesFor(actor.role);
  if (!allowed.includes(targetRole)) {
    throw new ForbiddenError(
      `Your role (${actor.role}) cannot assign the "${targetRole}" role.`
    );
  }
}

function assertCanMutateTarget(actor: ActorContext, target: ProfileRow) {
  if (target.userId === actor.userId) {
    throw new ForbiddenError("You cannot modify your own account here.");
  }

  if (target.role === "superadmin" && actor.role !== "superadmin") {
    throw new ForbiddenError("Only superadmins can manage superadmin accounts.");
  }

  if (actor.role !== "superadmin") {
    if (target.tenantId && target.tenantId !== actor.tenantId) {
      throw new ForbiddenError(
        "You cannot modify accounts outside your institutional workspace."
      );
    }
  }

  if (target.role === "admin" && actor.role === "admin") {
    throw new ForbiddenError("Admins cannot modify other admin accounts.");
  }

  if (actor.role === "admin" && !["staff", "borrower"].includes(target.role)) {
    throw new ForbiddenError("Admins may only manage staff and borrower accounts.");
  }
}

export class UserService {
  private readonly auditLogs = new AuditLogService();

  constructor(
    private readonly profileRepository: IProfileRepository = new ProfileRepository(),
    private readonly departmentRepository: DepartmentRepository = new DepartmentRepository()
  ) {}

  async getMe(actor: ActorContext): Promise<ProfileDTO> {
    // Record presence while loading the current profile (throttled in repo).
    try {
      await this.profileRepository.touchLastActive(actor.userId);
    } catch {
      // Best-effort — presence should not fail the profile load.
    }

    const row = await this.profileRepository.findByUserId(actor.userId);
    if (!row) {
      throw new NotFoundError("Profile", actor.userId);
    }
    return toProfileDTO(row);
  }

  /**
   * Best-effort last-active stamp for layouts / session gates.
   * Does not throw.
   */
  async recordActivity(userId: string): Promise<void> {
    try {
      await this.profileRepository.touchLastActive(userId);
    } catch {
      // ignore
    }
  }

  async updateMe(rawInput: unknown, actor: ActorContext): Promise<ProfileDTO> {
    const input = updateMeSchema.parse(rawInput);
    const existing = await this.profileRepository.findByUserId(actor.userId);
    if (!existing) {
      throw new NotFoundError("Profile", actor.userId);
    }

    const updated = await this.profileRepository.update(actor.userId, {
      ...(input.name !== undefined ? { fullName: input.name } : {}),
    });

    if (!updated) {
      throw new NotFoundError("Profile", actor.userId);
    }

    invalidateProfileCache(actor.userId);

    if (input.name !== undefined) {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.updateUserById(actor.userId, {
          user_metadata: { full_name: input.name },
        });
      } catch {
        // Profile update already succeeded; auth metadata is optional.
      }
    }

    const fresh = await this.profileRepository.findByUserId(actor.userId);
    if (!fresh) throw new NotFoundError("Profile", actor.userId);
    return toProfileDTO(fresh);
  }

  private async resolveDepartmentForAccount(
    role: AppRole,
    departmentId: string | null | undefined,
    currentUserId?: string,
    targetTenantId?: string
  ): Promise<{ departmentId: string | null; departmentName: string | null }> {
    if (role !== "borrower") {
      return { departmentId: null, departmentName: null };
    }

    if (!departmentId) {
      throw new BadRequestError(
        "A department is required for a department account."
      );
    }

    const department = await this.departmentRepository.findById(departmentId, undefined, targetTenantId);
    if (!department) {
      throw new NotFoundError("Department", departmentId);
    }

    const existingAccount =
      await this.profileRepository.findBorrowerByDepartmentId(department.id, targetTenantId);
    if (existingAccount && existingAccount.userId !== currentUserId) {
      throw new ConflictError(
        `${department.name} already has a department account (${existingAccount.email}).`
      );
    }

    return { departmentId: department.id, departmentName: department.name };
  }

  async changePassword(
    rawInput: unknown,
    actor: ActorContext
  ): Promise<{ updated: true }> {
    const input = changePasswordSchema.parse(rawInput);
    const email =
      actor.email ??
      (await this.profileRepository.findByUserId(actor.userId))?.email;

    if (!email) {
      throw new BadRequestError("Your account has no email to verify against.");
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anonKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured."
      );
    }

    const verifier = createSupabaseClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email,
      password: input.currentPassword,
    });
    if (verifyError) {
      throw new BadRequestError("Current password is incorrect.");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: input.newPassword,
    });
    if (error) {
      throw new BadRequestError(error.message || "Failed to update password.");
    }

    return { updated: true };
  }

  async listUsersForActor(
    actor: ActorContext,
    rawQuery: unknown
  ): Promise<ProfileDTO[]> {
    const filters: ListUsersFilters = listUsersQuerySchema.parse(rawQuery ?? {});
    const scopedFilters: ListUsersFilters = { ...filters };
    if (actor.role !== "superadmin") {
      scopedFilters.tenantId = actor.tenantId;
    } else if (!filters.tenantId && actor.tenantId && !actor.isCrossTenant) {
      scopedFilters.tenantId = actor.tenantId;
    }
    const rows = await this.profileRepository.list(scopedFilters);

    return rows
      .filter((row) => {
        if (actor.role === "superadmin") {
          // If the query specifically requests "all" tenants
          if (filters.tenantId === "all") {
            return true;
          }
          // If the query specifically requests a tenant, filter by it
          if (filters.tenantId) {
            return row.tenantId === filters.tenantId;
          }
          // If superadmin has an explicit tenant selected via workspace switcher, filter to it; else allow all
          if (actor.tenantId && !actor.isCrossTenant) {
            return row.tenantId === actor.tenantId;
          }
          return true;
        }
        // Non-superadmins only see users in their tenant
        if (row.tenantId && row.tenantId !== actor.tenantId) return false;
        // Admins never see superadmin profiles
        if (row.role === "superadmin") return false;
        return true;
      })
      .map(toProfileDTO);
  }

  async createUser(
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ProfileDTO> {
    const input: CreateUserInput = createUserSchema.parse(rawInput);
    assertCanAssignRole(actor, input.role);

    const email = input.email.trim().toLowerCase();
    const existing = await this.profileRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError("A profile with this email already exists.");
    }

    const admin = createAdminClient();

    const targetTenantId =
      input.role === "superadmin"
        ? undefined
        : actor.role === "superadmin" && input.tenantId
        ? input.tenantId
        : actor.tenantId ?? undefined;

    const link = await this.resolveDepartmentForAccount(
      input.role,
      input.departmentId,
      undefined,
      targetTenantId
    );
    const fullName = input.name.trim() || link.departmentName || input.email;

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (error || !data.user) {
      const message = error?.message ?? "Failed to create auth user.";
      if (message.toLowerCase().includes("already")) {
        throw new ConflictError(
          "This email is already registered. Use a different email or edit the existing account."
        );
      }
      throw new BadRequestError(message);
    }

    try {
      await this.profileRepository.create({
        userId: data.user.id,
        tenantId: input.role === "superadmin" ? null : (actor.role === "superadmin" && input.tenantId ? input.tenantId : actor.tenantId),
        email,
        fullName,
        role: input.role,
        status: "active",
        department: link.departmentName,
        departmentId: link.departmentId,
        createdByUserId: actor.userId,
        lastActiveAt: null,
      });

      const created = await this.profileRepository.findByUserId(data.user.id);
      if (!created) {
        throw new Error("Profile was created but could not be reloaded.");
      }
      await this.auditLogs.log({
        entityType: AUDIT_ENTITY.user,
        entityId: created.userId,
        action: AUDIT_ACTION.created,
        actorName: actor.displayName,
        actorUserId: actor.userId,
        notes: `Created user account ${created.email} (${created.role}).`,
        metadata: {
          targetUserId: created.userId,
          email: created.email,
          role: created.role,
          status: created.status,
          tenantId: created.tenantId,
          departmentId: created.departmentId,
        },
      });
      return toProfileDTO(created);
    } catch (error) {
      // Roll back auth user if profile insert fails so admins can retry cleanly
      try {
        await admin.auth.admin.deleteUser(data.user.id);
      } catch {
        // Best-effort cleanup
      }

      if (error instanceof ConflictError || error instanceof BadRequestError) {
        throw error;
      }
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          "This email is already registered, or that department already has an account."
        );
      }
      throw error;
    }
  }

  async updateUser(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ProfileDTO> {
    const userId = userIdSchema.parse(rawId);
    const input: UpdateUserInput = updateUserSchema.parse(rawInput);

    const existing = await this.profileRepository.findByUserId(userId);
    if (!existing) {
      throw new NotFoundError("User", userId);
    }

    assertCanMutateTarget(actor, existing);

    if (input.role !== undefined) {
      assertCanAssignRole(actor, input.role);
    }

    // Password changes go through Supabase Auth admin API only
    if (input.password) {
      const admin = createAdminClient();
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: input.password,
      });
      if (error) {
        throw new BadRequestError(
          error.message || "Failed to update user password."
        );
      }
    }

    const nextRole = input.role ?? existing.role;
    const departmentIdChanged = input.departmentId !== undefined;
    const nextDepartmentId = departmentIdChanged
      ? input.departmentId
      : existing.departmentId;

    const link = await this.resolveDepartmentForAccount(
      nextRole,
      nextDepartmentId,
      userId,
      existing.tenantId ?? actor.tenantId ?? undefined
    );

    const hasProfileFields =
      input.name !== undefined ||
      input.role !== undefined ||
      departmentIdChanged ||
      input.status !== undefined;

    if (hasProfileFields) {
      try {
        const updated = await this.profileRepository.update(userId, {
          ...(input.name !== undefined ? { fullName: input.name } : {}),
          ...(input.role !== undefined ? { role: input.role } : {}),
          departmentId: link.departmentId,
          department: link.departmentName,
          ...(input.status !== undefined ? { status: input.status } : {}),
        });

        if (!updated) {
          throw new NotFoundError("User", userId);
        }
      } catch (error) {
        if (error instanceof ConflictError || error instanceof NotFoundError) {
          throw error;
        }
        if (isUniqueViolation(error)) {
          throw new ConflictError(
            "That department already has a department account."
          );
        }
        throw error;
      }
    }

    invalidateProfileCache(userId);

    // Sync display name onto auth metadata (best-effort)
    if (input.name !== undefined) {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: { full_name: input.name },
        });
      } catch {
        // Profile update already succeeded; auth metadata is optional.
      }
    }

    // Ban/unban auth session on deactivate/reactivate
    if (input.status !== undefined) {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.updateUserById(userId, {
          ban_duration: input.status === "deactivated" ? "876000h" : "none",
        });
      } catch {
        // Profile is source of truth for app access either way.
      }
    }

    const row = await this.profileRepository.findByUserId(userId);
    if (!row) throw new NotFoundError("User", userId);

    const changedFields: Record<string, unknown> = {};
    if (existing.fullName !== row.fullName) {
      changedFields.name = { from: existing.fullName, to: row.fullName };
    }
    if (existing.role !== row.role) {
      changedFields.role = { from: existing.role, to: row.role };
    }
    if (existing.status !== row.status) {
      changedFields.status = { from: existing.status, to: row.status };
    }
    if (existing.departmentId !== row.departmentId) {
      changedFields.departmentId = {
        from: existing.departmentId,
        to: row.departmentId,
      };
    }

    let action: string = AUDIT_ACTION.updated;
    if (existing.status !== row.status) {
      action =
        row.status === "deactivated"
          ? AUDIT_ACTION.userDeactivated
          : AUDIT_ACTION.userActivated;
    } else if (existing.role !== row.role) {
      action = AUDIT_ACTION.userRoleChanged;
    }

    await this.auditLogs.log({
      entityType: AUDIT_ENTITY.user,
      entityId: row.userId,
      action,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Updated user account ${row.email}.`,
      metadata: {
        targetUserId: row.userId,
        email: row.email,
        changedFields,
      },
    });
    return toProfileDTO(row);
  }

  async deactivateUser(rawId: string, actor: ActorContext): Promise<ProfileDTO> {
    return this.updateUser(rawId, { status: "deactivated" }, actor);
  }

  async reactivateUser(rawId: string, actor: ActorContext): Promise<ProfileDTO> {
    return this.updateUser(rawId, { status: "active" }, actor);
  }
}
