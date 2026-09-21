import { and, eq, isNotNull, ne, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import { pettyCashVouchers, vouchers } from "@/server/db/schema";
import { ConflictError } from "@/server/shared/errors";
import { getTenantContext } from "@/server/shared/tenant-context";

export type PoDisbursementKind = "voucher" | "petty_cash";

export type PoDisbursementClaim = {
  kind: PoDisbursementKind;
  id: string;
  code: string;
  status: string;
  purchaseOrderNumber: string;
};

function normalizePoNumber(poNumber: string): string {
  return poNumber.trim().toLowerCase();
}

/**
 * Find an active (non-cancelled) voucher or petty-cash claim for a PO number.
 */
export async function findActivePoDisbursement(
  poNumber: string,
  tenantId?: string,
  options?: {
    excludeVoucherId?: string;
    excludePettyCashId?: string;
  }
): Promise<PoDisbursementClaim | null> {
  const trimmed = poNumber.trim();
  if (!trimmed) return null;

  const db = getDb();
  const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
  const needle = normalizePoNumber(trimmed);

  const voucherConditions = [
    isNotNull(vouchers.purchaseOrderNumber),
    ne(vouchers.status, "cancelled"),
    sql`lower(trim(${vouchers.purchaseOrderNumber})) = ${needle}`,
  ];
  if (resolvedTenantId) {
    voucherConditions.push(eq(vouchers.tenantId, resolvedTenantId));
  }
  if (options?.excludeVoucherId) {
    voucherConditions.push(ne(vouchers.id, options.excludeVoucherId));
  }

  const [voucherRow] = await db
    .select({
      id: vouchers.id,
      code: vouchers.voucherCode,
      status: vouchers.status,
      purchaseOrderNumber: vouchers.purchaseOrderNumber,
    })
    .from(vouchers)
    .where(and(...voucherConditions))
    .limit(1);

  if (voucherRow?.purchaseOrderNumber) {
    return {
      kind: "voucher",
      id: voucherRow.id,
      code: voucherRow.code,
      status: voucherRow.status,
      purchaseOrderNumber: voucherRow.purchaseOrderNumber,
    };
  }

  const pettyConditions = [
    isNotNull(pettyCashVouchers.purchaseOrderNumber),
    ne(pettyCashVouchers.status, "cancelled"),
    sql`lower(trim(${pettyCashVouchers.purchaseOrderNumber})) = ${needle}`,
  ];
  if (resolvedTenantId) {
    pettyConditions.push(eq(pettyCashVouchers.tenantId, resolvedTenantId));
  }
  if (options?.excludePettyCashId) {
    pettyConditions.push(ne(pettyCashVouchers.id, options.excludePettyCashId));
  }

  const [pettyRow] = await db
    .select({
      id: pettyCashVouchers.id,
      code: pettyCashVouchers.pcvNumber,
      status: pettyCashVouchers.status,
      purchaseOrderNumber: pettyCashVouchers.purchaseOrderNumber,
    })
    .from(pettyCashVouchers)
    .where(and(...pettyConditions))
    .limit(1);

  if (pettyRow?.purchaseOrderNumber) {
    return {
      kind: "petty_cash",
      id: pettyRow.id,
      code: pettyRow.code,
      status: pettyRow.status,
      purchaseOrderNumber: pettyRow.purchaseOrderNumber,
    };
  }

  return null;
}

/** Map of normalized PO number → active disbursement claim. */
export async function listActivePoDisbursements(
  tenantId?: string
): Promise<Map<string, PoDisbursementClaim>> {
  const db = getDb();
  const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
  const map = new Map<string, PoDisbursementClaim>();

  const voucherConditions = [
    isNotNull(vouchers.purchaseOrderNumber),
    ne(vouchers.status, "cancelled"),
  ];
  if (resolvedTenantId) {
    voucherConditions.push(eq(vouchers.tenantId, resolvedTenantId));
  }

  const voucherRows = await db
    .select({
      id: vouchers.id,
      code: vouchers.voucherCode,
      status: vouchers.status,
      purchaseOrderNumber: vouchers.purchaseOrderNumber,
    })
    .from(vouchers)
    .where(and(...voucherConditions));

  for (const row of voucherRows) {
    if (!row.purchaseOrderNumber) continue;
    const key = normalizePoNumber(row.purchaseOrderNumber);
    if (!map.has(key)) {
      map.set(key, {
        kind: "voucher",
        id: row.id,
        code: row.code,
        status: row.status,
        purchaseOrderNumber: row.purchaseOrderNumber,
      });
    }
  }

  const pettyConditions = [
    isNotNull(pettyCashVouchers.purchaseOrderNumber),
    ne(pettyCashVouchers.status, "cancelled"),
  ];
  if (resolvedTenantId) {
    pettyConditions.push(eq(pettyCashVouchers.tenantId, resolvedTenantId));
  }

  const pettyRows = await db
    .select({
      id: pettyCashVouchers.id,
      code: pettyCashVouchers.pcvNumber,
      status: pettyCashVouchers.status,
      purchaseOrderNumber: pettyCashVouchers.purchaseOrderNumber,
    })
    .from(pettyCashVouchers)
    .where(and(...pettyConditions));

  for (const row of pettyRows) {
    if (!row.purchaseOrderNumber) continue;
    const key = normalizePoNumber(row.purchaseOrderNumber);
    if (!map.has(key)) {
      map.set(key, {
        kind: "petty_cash",
        id: row.id,
        code: row.code,
        status: row.status,
        purchaseOrderNumber: row.purchaseOrderNumber,
      });
    }
  }

  return map;
}

export async function assertPoAvailableForDisbursement(
  poNumber: string | null | undefined,
  tenantId?: string,
  options?: {
    excludeVoucherId?: string;
    excludePettyCashId?: string;
  }
): Promise<void> {
  if (!poNumber?.trim()) return;

  const existing = await findActivePoDisbursement(
    poNumber,
    tenantId,
    options
  );
  if (!existing) return;

  if (existing.kind === "voucher") {
    throw new ConflictError(
      `Purchase Order "${poNumber.trim()}" is already linked to disbursement voucher ${existing.code}. A PO can only be vouched or petty-cashed once.`
    );
  }

  throw new ConflictError(
    `Purchase Order "${poNumber.trim()}" is already linked to petty cash voucher ${existing.code}. A PO can only be vouched or petty-cashed once.`
  );
}
