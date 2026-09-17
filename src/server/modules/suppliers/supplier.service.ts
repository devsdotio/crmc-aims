import type { SupplierRow } from "@/server/db/schema";
import type { ActorContext } from "@/server/shared/auth";
import { generateOperationalCode } from "@/server/shared/codes";
import { NotFoundError } from "@/server/shared/errors";
import { serverCache } from "@/server/shared/cache";

import { SupplierRepository } from "./supplier.repository";
import type { SupplierDTO } from "./supplier.types";
import {
  createSupplierSchema,
  listSuppliersQuerySchema,
  supplierIdSchema,
  updateSupplierSchema,
} from "./supplier.validation";

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function toDTO(row: SupplierRow): SupplierDTO {
  return {
    id: row.id,
    supplierCode: row.supplierCode,
    name: row.name,
    contactName: row.contactName ?? null,
    contactEmail: row.contactEmail ?? null,
    contactPhone: row.contactPhone ?? null,
    address: row.address ?? null,
    notes: row.notes ?? null,
    status: row.status,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class SupplierService {
  constructor(private readonly repo = new SupplierRepository()) {}

  async list(rawQuery: unknown, actorTenantId?: string): Promise<SupplierDTO[]> {
    const filters = listSuppliersQuerySchema.parse(rawQuery ?? {});
    const tenantId =
      actorTenantId ??
      (await import("@/server/shared/tenant-context")).getTenantContext()?.tenantId ??
      "global";
    const cacheKey = `tenant:${tenantId}:suppliers:list:${JSON.stringify(filters)}`;
    return serverCache.wrap(
      cacheKey,
      10 * 60 * 1000,
      async () => {
        const rows = await this.repo.list(filters, undefined, tenantId);
        return rows.map(toDTO);
      },
      ["suppliers", `tenant:${tenantId}:suppliers`]
    );
  }

  async getById(rawId: string, actorTenantId?: string): Promise<SupplierDTO> {
    const id = supplierIdSchema.parse(rawId);
    const row = await this.repo.findById(id, undefined, actorTenantId);
    if (!row) throw new NotFoundError("Supplier", id);
    return toDTO(row);
  }

  async create(rawInput: unknown, actor: ActorContext): Promise<SupplierDTO> {
    const input = createSupplierSchema.parse(rawInput);
    const row = await this.repo.create({
      tenantId: actor.tenantId,
      supplierCode: generateOperationalCode("SUP"),
      name: input.name,
      contactName: emptyToNull(input.contactName),
      contactEmail: emptyToNull(input.contactEmail),
      contactPhone: emptyToNull(input.contactPhone),
      address: emptyToNull(input.address),
      notes: emptyToNull(input.notes),
      status: input.status,
      createdByUserId: actor.userId,
      createdByName: actor.displayName,
    });
    serverCache.invalidateTag("suppliers");
    if (actor.tenantId) {
      serverCache.invalidateTag(`tenant:${actor.tenantId}:suppliers`);
    }
    return toDTO(row);
  }

  async update(
    rawId: string,
    rawInput: unknown,
    actorTenantId?: string
  ): Promise<SupplierDTO> {
    const id = supplierIdSchema.parse(rawId);
    const input = updateSupplierSchema.parse(rawInput);

    const existing = await this.repo.findById(id, undefined, actorTenantId);
    if (!existing) throw new NotFoundError("Supplier", id);

    const updated = await this.repo.update(
      id,
      {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.contactName !== undefined
          ? { contactName: emptyToNull(input.contactName) }
          : {}),
        ...(input.contactEmail !== undefined
          ? { contactEmail: emptyToNull(input.contactEmail) }
          : {}),
        ...(input.contactPhone !== undefined
          ? { contactPhone: emptyToNull(input.contactPhone) }
          : {}),
        ...(input.address !== undefined
          ? { address: emptyToNull(input.address) }
          : {}),
        ...(input.notes !== undefined ? { notes: emptyToNull(input.notes) } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      undefined,
      actorTenantId
    );

    if (!updated) throw new NotFoundError("Supplier", id);
    serverCache.invalidateTag("suppliers");
    if (actorTenantId) {
      serverCache.invalidateTag(`tenant:${actorTenantId}:suppliers`);
    }
    return toDTO(updated);
  }

  /** Soft-deactivate — keep purchase history linked. */
  async deactivate(rawId: string, actorTenantId?: string): Promise<SupplierDTO> {
    return this.update(rawId, { status: "inactive" }, actorTenantId);
  }
}
