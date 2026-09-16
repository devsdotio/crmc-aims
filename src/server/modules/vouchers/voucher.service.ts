import type { VoucherRow } from "@/server/db/schema";
import type { ActorContext } from "@/server/shared/auth";
import { ConflictError, NotFoundError } from "@/server/shared/errors";
import { serverCache } from "@/server/shared/cache";

import { VoucherRepository } from "./voucher.repository";
import type { VoucherDTO, ListVoucherFilters } from "./voucher.types";
import {
  createVoucherSchema,
  listVouchersQuerySchema,
  updateVoucherSchema,
  updateVoucherStatusSchema,
  voucherIdSchema,
} from "./voucher.validation";

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function toDTO(row: VoucherRow): VoucherDTO {
  return {
    id: row.id,
    voucherCode: row.voucherCode,
    type: row.type,
    status: row.status,
    voucherDate: row.voucherDate,
    payeeName: row.payeeName,
    amount: row.amount,
    supplierId: row.supplierId ?? null,
    supplierName: row.supplierName ?? null,
    purchaseOrderNumber: row.purchaseOrderNumber ?? null,
    assetId: row.assetId ?? null,
    assetCode: row.assetCode ?? null,
    assetName: row.assetName ?? null,
    particulars: row.particulars,
    checkNumber: row.checkNumber ?? null,
    isLegacy: row.isLegacy,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    approvedByUserId: row.approvedByUserId ?? null,
    approvedByName: row.approvedByName ?? null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    completedByUserId: row.completedByUserId ?? null,
    completedByName: row.completedByName ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class VoucherService {
  constructor(private readonly repo = new VoucherRepository()) {}

  async list(rawQuery: unknown): Promise<{ vouchers: VoucherDTO[]; total: number }> {
    const filters = listVouchersQuerySchema.parse(rawQuery ?? {});
    const cacheKey = `vouchers:list:${JSON.stringify(filters)}`;

    return serverCache.wrap(
      cacheKey,
      30 * 1000,
      async () => {
        const { vouchers, total } = await this.repo.list(filters as ListVoucherFilters);
        return {
          vouchers: vouchers.map(toDTO),
          total,
        };
      },
      ["vouchers"]
    );
  }

  async getById(rawId: string): Promise<VoucherDTO> {
    const id = voucherIdSchema.parse(rawId);
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundError("Voucher", id);
    return toDTO(row);
  }

  async create(rawInput: unknown, actor: ActorContext): Promise<VoucherDTO> {
    const input = createVoucherSchema.parse(rawInput);

    const existing = await this.repo.findByCode(input.voucherCode);
    if (existing) {
      throw new ConflictError(
        `Voucher with code "${input.voucherCode}" already exists.`
      );
    }

    const row = await this.repo.create({
      voucherCode: input.voucherCode,
      type: input.type,
      status: input.status,
      voucherDate: input.voucherDate,
      payeeName: input.payeeName,
      amount: input.amount,
      supplierId: emptyToNull(input.supplierId),
      supplierName: emptyToNull(input.supplierName),
      purchaseOrderNumber: emptyToNull(input.purchaseOrderNumber),
      assetId: emptyToNull(input.assetId),
      assetCode: emptyToNull(input.assetCode),
      assetName: emptyToNull(input.assetName),
      particulars: input.particulars ?? "",
      checkNumber: emptyToNull(input.checkNumber),
      isLegacy: input.isLegacy ?? false,
      createdByUserId: actor.userId,
      createdByName: actor.displayName,
      approvedByUserId: null,
      approvedByName: null,
      approvedAt: null,
      completedByUserId: null,
      completedByName: null,
      completedAt: null,
    });

    serverCache.invalidateTag("vouchers");
    return toDTO(row);
  }

  async update(rawId: string, rawInput: unknown): Promise<VoucherDTO> {
    const id = voucherIdSchema.parse(rawId);
    const input = updateVoucherSchema.parse(rawInput);

    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Voucher", id);

    const updated = await this.repo.update(id, {
      ...(input.payeeName !== undefined ? { payeeName: input.payeeName } : {}),
      ...(input.voucherDate !== undefined ? { voucherDate: input.voucherDate } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.supplierId !== undefined ? { supplierId: emptyToNull(input.supplierId) } : {}),
      ...(input.supplierName !== undefined ? { supplierName: emptyToNull(input.supplierName) } : {}),
      ...(input.purchaseOrderNumber !== undefined
        ? { purchaseOrderNumber: emptyToNull(input.purchaseOrderNumber) }
        : {}),
      ...(input.assetId !== undefined ? { assetId: emptyToNull(input.assetId) } : {}),
      ...(input.assetCode !== undefined ? { assetCode: emptyToNull(input.assetCode) } : {}),
      ...(input.assetName !== undefined ? { assetName: emptyToNull(input.assetName) } : {}),
      ...(input.particulars !== undefined ? { particulars: input.particulars } : {}),
      ...(input.checkNumber !== undefined ? { checkNumber: emptyToNull(input.checkNumber) } : {}),
    });

    if (!updated) throw new NotFoundError("Voucher", id);
    serverCache.invalidateTag("vouchers");
    return toDTO(updated);
  }

  async updateStatus(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<VoucherDTO> {
    const id = voucherIdSchema.parse(rawId);
    const input = updateVoucherStatusSchema.parse(rawInput);

    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Voucher", id);

    const updatePayload: Partial<VoucherRow> = {
      status: input.status,
    };

    if (input.status === "approved") {
      updatePayload.approvedByUserId = actor.userId;
      updatePayload.approvedByName = actor.displayName;
      updatePayload.approvedAt = new Date();
    } else if (input.status === "completed") {
      updatePayload.completedByUserId = actor.userId;
      updatePayload.completedByName = actor.displayName;
      updatePayload.completedAt = new Date();
    }

    const updated = await this.repo.update(id, updatePayload);
    if (!updated) throw new NotFoundError("Voucher", id);

    serverCache.invalidateTag("vouchers");
    return toDTO(updated);
  }

  async delete(rawId: string): Promise<{ success: boolean }> {
    const id = voucherIdSchema.parse(rawId);
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Voucher", id);

    const success = await this.repo.delete(id);
    serverCache.invalidateTag("vouchers");
    return { success };
  }
}
