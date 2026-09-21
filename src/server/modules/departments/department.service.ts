import type { Department } from "@/server/db/schema";
import { isUniqueViolation } from "@/server/db/transaction";
import {
  ConflictError,
  NotFoundError,
} from "@/server/shared/errors";
import { invalidateProfileCache } from "@/server/shared/auth";
import { serverCache } from "@/server/shared/cache";

import { DepartmentRepository } from "./department.repository";
import type { DepartmentDTO, DepartmentListRow } from "./department.types";
import {
  createDepartmentSchema,
  departmentIdSchema,
  listDepartmentsQuerySchema,
  updateDepartmentSchema,
} from "./department.validation";

function toDTO(row: Department | DepartmentListRow): DepartmentDTO {
  const listed = row as DepartmentListRow;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isSandbox: row.isSandbox,
    accountUserId: listed.accountUserId ?? null,
    accountEmail: listed.accountEmail ?? null,
    accountStatus: listed.accountStatus ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class DepartmentService {
  constructor(private readonly repo = new DepartmentRepository()) {}

  async list(rawQuery: unknown, actorTenantId?: string): Promise<DepartmentDTO[]> {
    const filters = listDepartmentsQuerySchema.parse(rawQuery ?? {});
    const tenantId = actorTenantId ?? (await import("@/server/shared/tenant-context")).getTenantContext()?.tenantId ?? "global";
    const cacheKey = `tenant:${tenantId}:departments:list:${JSON.stringify(filters)}`;
    return serverCache.wrap(
      cacheKey,
      10 * 60 * 1000,
      async () => {
        const rows = await this.repo.list(filters, undefined, actorTenantId);
        return rows.map(toDTO);
      },
      ["departments", `tenant:${tenantId}:departments`]
    );
  }

  async getById(rawId: string, actorTenantId?: string): Promise<DepartmentDTO> {
    const id = departmentIdSchema.parse(rawId);
    // By-id fetch lists all departments (no list filters).
    const rows = await this.repo.list({ includeSandbox: true }, undefined, actorTenantId);
    const match = rows.find((row) => row.id === id);
    if (!match) throw new NotFoundError("Department", id);
    return toDTO(match);
  }

  async create(rawInput: unknown, actorTenantId?: string): Promise<DepartmentDTO> {
    const input = createDepartmentSchema.parse(rawInput);

    const byCode = await this.repo.findByCode(input.code, undefined, actorTenantId);
    if (byCode) {
      throw new ConflictError(
        `Department code "${input.code}" is already in use.`
      );
    }

    const byName = await this.repo.findByNameLower(input.name, undefined, actorTenantId);
    if (byName) {
      throw new ConflictError(
        `Department "${input.name}" already exists.`
      );
    }

    try {
      const row = await this.repo.create({
        code: input.code,
        name: input.name,
        isSandbox: input.isSandbox ?? false,
        tenantId: actorTenantId,
      });
      serverCache.invalidateTag("departments");
      if (actorTenantId) {
        serverCache.invalidateTag(`tenant:${actorTenantId}:departments`);
      }
      return toDTO({
        ...row,
        accountUserId: null,
        accountEmail: null,
        accountStatus: null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          "A department with this code or name already exists."
        );
      }
      throw error;
    }
  }

  async update(rawId: string, rawInput: unknown, actorTenantId?: string): Promise<DepartmentDTO> {
    const id = departmentIdSchema.parse(rawId);
    const input = updateDepartmentSchema.parse(rawInput);

    const existing = await this.repo.findById(id, undefined, actorTenantId);
    if (!existing) throw new NotFoundError("Department", id);

    if (input.code && input.code !== existing.code) {
      const clash = await this.repo.findByCode(input.code, undefined, actorTenantId);
      if (clash && clash.id !== id) {
        throw new ConflictError(
          `Department code "${input.code}" is already in use.`
        );
      }
    }

    if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
      const clash = await this.repo.findByNameLower(input.name, undefined, actorTenantId);
      if (clash && clash.id !== id) {
        throw new ConflictError(`Department "${input.name}" already exists.`);
      }
    }

    let updated: Department | null;
    try {
      updated = await this.repo.update(id, {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isSandbox !== undefined
          ? { isSandbox: input.isSandbox }
          : {}),
      }, undefined, actorTenantId);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          "A department with this code or name already exists."
        );
      }
      throw error;
    }

    if (!updated) throw new NotFoundError("Department", id);

    serverCache.invalidateTag("departments");
    if (actorTenantId) {
      serverCache.invalidateTag(`tenant:${actorTenantId}:departments`);
    }

    if (input.name && input.name !== existing.name) {
      await this.repo.syncLinkedProfileDepartmentName(id, updated.name);
      invalidateProfileCache();
    }

    return this.getById(id, actorTenantId);
  }

  async delete(rawId: string, actorTenantId?: string): Promise<{ deleted: true }> {
    const id = departmentIdSchema.parse(rawId);
    const existing = await this.repo.findById(id, undefined, actorTenantId);
    if (!existing) throw new NotFoundError("Department", id);

    const linked = await this.repo.countLinkedProfiles(id);
    if (linked > 0) {
      throw new ConflictError(
        "This department still has a linked account. Deactivate or reassign that account first."
      );
    }

    const deleted = await this.repo.delete(id, undefined, actorTenantId);
    if (!deleted) throw new NotFoundError("Department", id);
    serverCache.invalidateTag("departments");
    if (actorTenantId) {
      serverCache.invalidateTag(`tenant:${actorTenantId}:departments`);
    }
    return { deleted: true };
  }
}
