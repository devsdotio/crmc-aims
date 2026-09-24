import type { PettyCashRow } from "@/server/db/schema";
import type { ActorContext } from "@/server/shared/auth";
import { ConflictError, NotFoundError } from "@/server/shared/errors";
import { serverCache } from "@/server/shared/cache";

import { assertPoAvailableForDisbursement } from "@/server/modules/purchase-lots/po-disbursement";
import {
  fallbackDepartments,
  listPettyCashDepartmentLinks,
  replacePettyCashDepartmentLinks,
  requestedDepartmentIds,
  resolveDepartmentRefs,
} from "@/server/modules/disbursements/disbursement-departments";
import { PettyCashRepository } from "./petty-cash.repository";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import type { PettyCashDTO, ListPettyCashFilters } from "./petty-cash.types";
import {
  createPettyCashSchema,
  listPettyCashQuerySchema,
  updatePettyCashSchema,
  updatePettyCashStatusSchema,
  pettyCashIdSchema,
} from "./petty-cash.validation";

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function toDTO(row: PettyCashRow): PettyCashDTO {
  return {
    id: row.id,
    pcvNumber: row.pcvNumber,
    status: row.status,
    voucherDate: row.voucherDate,
    payeeName: row.payeeName,
    amount: row.amount,
    category: row.category,
    purpose: row.purpose ?? "",
    particulars: row.particulars,
    receiptNumber: row.receiptNumber ?? null,
    supplierId: row.supplierId ?? null,
    supplierName: row.supplierName ?? null,
    purchaseOrderNumber: row.purchaseOrderNumber ?? null,
    departmentId: row.departmentId ?? null,
    departmentName: row.departmentName ?? null,
    isLegacy: row.isLegacy,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    approvedByUserId: row.approvedByUserId ?? null,
    approvedByName: row.approvedByName ?? null,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    completedByUserId: row.completedByUserId ?? null,
    completedByName: row.completedByName ?? null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    departments: fallbackDepartments(row.departmentId, row.departmentName),
  };
}

function withDepartments(
  dto: PettyCashDTO,
  departments?: Array<{ id: string; name: string }>
): PettyCashDTO {
  const list =
    departments && departments.length > 0
      ? departments
      : fallbackDepartments(dto.departmentId, dto.departmentName);
  return {
    ...dto,
    departments: list,
    departmentId: list[0]?.id ?? dto.departmentId,
    departmentName:
      list.map((d) => d.name).join(", ") || dto.departmentName,
  };
}

async function attachPettyCashDepartments(
  dtos: PettyCashDTO[],
  tenantId?: string
): Promise<PettyCashDTO[]> {
  if (dtos.length === 0) return dtos;
  const links = await listPettyCashDepartmentLinks(
    dtos.map((d) => d.id),
    tenantId
  );
  return dtos.map((dto) => withDepartments(dto, links.get(dto.id)));
}

export class PettyCashService {
  constructor(
    private readonly repo: PettyCashRepository = new PettyCashRepository(),
    private readonly auditLogs: AuditLogService = new AuditLogService()
  ) {}

  async generateNextPcvCode(now = new Date(), actorTenantId?: string): Promise<string> {
    const year = now.getFullYear();
    const prefix = `PCV${year}-`;

    const latestCode = await this.repo.findLatestPcvCode(prefix, undefined, actorTenantId);
    if (!latestCode) {
      return `${prefix}000001`;
    }

    const suffix = latestCode.replace(prefix, "");
    const parsed = parseInt(suffix, 10);
    if (isNaN(parsed)) {
      return `${prefix}000001`;
    }

    return `${prefix}${String(parsed + 1).padStart(6, "0")}`;
  }

  async list(rawFilters: unknown, actorTenantId?: string): Promise<{ vouchers: PettyCashDTO[]; total: number }> {
    const filters = listPettyCashQuerySchema.parse(rawFilters);
    const tenantId =
      actorTenantId ??
      (await import("@/server/shared/tenant-context")).getTenantContext()?.tenantId ??
      "global";
    const cacheKey = `tenant:${tenantId}:petty-cash:list:${JSON.stringify(filters)}`;

    return serverCache.wrap(
      cacheKey,
      30 * 1000,
      async () => {
        const { vouchers, total } = await this.repo.list(filters as ListPettyCashFilters, undefined, tenantId);
        return {
          vouchers: await attachPettyCashDepartments(
            vouchers.map(toDTO),
            tenantId
          ),
          total,
        };
      },
      ["petty-cash", `tenant:${tenantId}:petty-cash`]
    );
  }

  async getById(rawId: unknown, actorTenantId?: string): Promise<PettyCashDTO> {
    const id = pettyCashIdSchema.parse(rawId);
    const voucher = await this.repo.findById(id, undefined, actorTenantId);
    if (!voucher) {
      throw new NotFoundError("Petty cash voucher not found");
    }
    const [dto] = await attachPettyCashDepartments([toDTO(voucher)], actorTenantId);
    return dto!;
  }

  async create(rawInput: unknown, actor: ActorContext): Promise<PettyCashDTO> {
    const input = createPettyCashSchema.parse(rawInput);

    let pcvNumber = input.pcvNumber;
    if (!pcvNumber) {
      pcvNumber = await this.generateNextPcvCode(undefined, actor.tenantId);
    } else {
      const existing = await this.repo.findByCode(pcvNumber, undefined, actor.tenantId);
      if (existing) {
        throw new ConflictError(`Petty cash voucher with code "${pcvNumber}" already exists.`);
      }
    }

    await assertPoAvailableForDisbursement(
      input.purchaseOrderNumber,
      actor.tenantId
    );

    const deptRefs = await resolveDepartmentRefs(
      requestedDepartmentIds(input.departmentIds, input.departmentId),
      actor.tenantId
    );
    const primaryDept = deptRefs[0];

    const row = await this.repo.create({
      tenantId: actor.tenantId,
      pcvNumber,
      status: input.status ?? "draft",
      voucherDate: input.voucherDate,
      payeeName: input.payeeName,
      amount: input.amount,
      category: input.category ?? "supplies",
      purpose: input.purpose ?? "",
      particulars: input.particulars ?? "",
      receiptNumber: emptyToNull(input.receiptNumber),
      purchaseOrderNumber: emptyToNull(input.purchaseOrderNumber),
      supplierId: input.supplierId ?? null,
      supplierName: emptyToNull(input.supplierName),
      departmentId: primaryDept?.id ?? input.departmentId ?? null,
      departmentName: primaryDept?.name ?? emptyToNull(input.departmentName),
      isLegacy: input.isLegacy ?? false,
      createdByUserId: actor.userId,
      createdByName: actor.displayName,
    });

    await this.auditLogs.log({
      entityType: "petty_cash",
      entityId: row.id,
      action: "created",
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Created petty cash voucher ${row.pcvNumber} for ${row.payeeName} (₱${row.amount}) - ${row.category}`,
      metadata: {
        pcvNumber: row.pcvNumber,
        payeeName: row.payeeName,
        amount: row.amount,
        category: row.category,
        receiptNumber: row.receiptNumber,
        purchaseOrderNumber: row.purchaseOrderNumber,
        supplierName: row.supplierName,
      },
    });

    await replacePettyCashDepartmentLinks(
      row.id,
      deptRefs.map((d) => d.id),
      actor.tenantId
    );

    await serverCache.invalidateTag("petty-cash");
    if (actor.tenantId) {
      await serverCache.invalidateTag(`tenant:${actor.tenantId}:petty-cash`);
    }
    return withDepartments(toDTO(row), deptRefs);
  }

  async update(
    rawId: unknown,
    rawInput: unknown,
    actor?: ActorContext
  ): Promise<PettyCashDTO> {
    const id = pettyCashIdSchema.parse(rawId);
    const input = updatePettyCashSchema.parse(rawInput);

    const existing = await this.repo.findById(id, undefined, actor?.tenantId);
    if (!existing) {
      throw new NotFoundError("Petty cash voucher not found");
    }

    if (input.pcvNumber && input.pcvNumber !== existing.pcvNumber) {
      const conflict = await this.repo.findByCode(input.pcvNumber, undefined, actor?.tenantId);
      if (conflict) {
        throw new ConflictError(`Petty cash voucher with code "${input.pcvNumber}" already exists.`);
      }
    }

    if (input.purchaseOrderNumber !== undefined) {
      await assertPoAvailableForDisbursement(
        input.purchaseOrderNumber,
        actor?.tenantId,
        { excludePettyCashId: id }
      );
    }

    const updated = await this.repo.update(id, {
      ...(input.pcvNumber !== undefined && { pcvNumber: input.pcvNumber }),
      ...(input.payeeName !== undefined && { payeeName: input.payeeName }),
      ...(input.voucherDate !== undefined && { voucherDate: input.voucherDate }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.particulars !== undefined && { particulars: input.particulars }),
      ...(input.receiptNumber !== undefined && { receiptNumber: emptyToNull(input.receiptNumber) }),
      ...(input.purchaseOrderNumber !== undefined && { purchaseOrderNumber: emptyToNull(input.purchaseOrderNumber) }),
      ...(input.supplierId !== undefined && { supplierId: input.supplierId }),
      ...(input.supplierName !== undefined && { supplierName: emptyToNull(input.supplierName) }),
      ...(input.departmentId !== undefined && { departmentId: input.departmentId }),
      ...(input.departmentName !== undefined && { departmentName: emptyToNull(input.departmentName) }),
      ...(input.isLegacy !== undefined && { isLegacy: input.isLegacy }),
    }, undefined, actor?.tenantId);

    if (!updated) {
      throw new NotFoundError("Petty cash voucher not found");
    }

    let nextDepartments: Array<{ id: string; name: string }> | undefined;
    if (input.departmentIds !== undefined || input.departmentId !== undefined) {
      nextDepartments = await resolveDepartmentRefs(
        requestedDepartmentIds(input.departmentIds, input.departmentId),
        actor?.tenantId
      );
      await replacePettyCashDepartmentLinks(
        id,
        nextDepartments.map((d) => d.id),
        actor?.tenantId
      );
    }

    await this.auditLogs.log({
      entityType: "petty_cash",
      entityId: id,
      action: "updated",
      actorName: actor?.displayName || "System",
      actorUserId: actor?.userId,
      notes: `Updated petty cash voucher ${updated.pcvNumber} details`,
      metadata: {
        updatedFields: Object.keys(input),
        changes: input,
      },
    });

    await serverCache.invalidateTag("petty-cash");
    if (actor?.tenantId) {
      await serverCache.invalidateTag(`tenant:${actor.tenantId}:petty-cash`);
    }
    if (nextDepartments) {
      return withDepartments(toDTO(updated), nextDepartments);
    }
    const [dto] = await attachPettyCashDepartments(
      [toDTO(updated)],
      actor?.tenantId
    );
    return dto!;
  }

  async updateStatus(
    rawId: unknown,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<PettyCashDTO> {
    const id = pettyCashIdSchema.parse(rawId);
    const { status } = updatePettyCashStatusSchema.parse(rawInput);

    const existing = await this.repo.findById(id, undefined, actor.tenantId);
    if (!existing) {
      throw new NotFoundError("Petty cash voucher not found");
    }

    const updates: Partial<Parameters<PettyCashRepository["update"]>[1]> = {
      status,
    };

    if (status === "approved" && existing.status !== "approved") {
      updates.approvedByUserId = actor.userId;
      updates.approvedByName = actor.displayName;
      updates.approvedAt = new Date();
    } else if (status === "completed" && existing.status !== "completed") {
      updates.completedByUserId = actor.userId;
      updates.completedByName = actor.displayName;
      updates.completedAt = new Date();
    }

    const updated = await this.repo.update(id, updates, undefined, actor.tenantId);
    if (!updated) {
      throw new NotFoundError("Petty cash voucher not found");
    }

    await this.auditLogs.log({
      entityType: "petty_cash",
      entityId: id,
      action: status,
      actorName: actor.displayName,
      actorUserId: actor.userId,
      notes: `Status changed from ${existing.status.replace("_", " ")} to ${status.replace("_", " ")}`,
      metadata: {
        previousStatus: existing.status,
        newStatus: status,
      },
    });

    await serverCache.invalidateTag("petty-cash");
    if (actor.tenantId) {
      await serverCache.invalidateTag(`tenant:${actor.tenantId}:petty-cash`);
    }
    const [dto] = await attachPettyCashDepartments(
      [toDTO(updated)],
      actor.tenantId
    );
    return dto!;
  }

  async delete(rawId: unknown, actor?: ActorContext): Promise<{ success: boolean }> {
    const id = pettyCashIdSchema.parse(rawId);
    const existing = await this.repo.findById(id, undefined, actor?.tenantId);
    if (!existing) {
      throw new NotFoundError("Petty cash voucher not found");
    }

    const deleted = await this.repo.delete(id, undefined, actor?.tenantId);

    await this.auditLogs.log({
      entityType: "petty_cash",
      entityId: id,
      action: "deleted",
      actorName: actor?.displayName || "System",
      actorUserId: actor?.userId,
      notes: `Deleted petty cash voucher ${existing.pcvNumber}`,
    });

    await serverCache.invalidateTag("petty-cash");
    if (actor?.tenantId) {
      await serverCache.invalidateTag(`tenant:${actor.tenantId}:petty-cash`);
    }
    return { success: deleted };
  }
}
