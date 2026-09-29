import { and, eq, isNotNull, ne, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { pettyCashVouchers, purchaseLots, vouchers } from "@/server/db/schema";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { serverCache } from "@/server/shared/cache";
import { BadRequestError, ConflictError } from "@/server/shared/errors";
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

function lotRowHasReceipt(
  receiptUrl: string | null,
  notes: string | null
): boolean {
  if (receiptUrl?.trim()) return true;
  if (!notes) return false;
  const trimmed = notes.trim();
  if (trimmed.startsWith("{") && trimmed.includes('"receiptUrl"')) {
    try {
      const meta = JSON.parse(trimmed) as { receiptUrl?: unknown };
      if (typeof meta.receiptUrl === "string" && meta.receiptUrl.trim()) {
        return true;
      }
    } catch {
      // fall through to the legacy marker
    }
  }
  return /\[RECEIPT_URL:\s*[^\]]+\]/i.test(notes);
}

/** True when any line on the PO already has a receipt file. */
export async function poHasReceipt(
  poNumber: string,
  tenantId?: string,
  session?: DbSession
): Promise<boolean> {
  const trimmed = poNumber.trim();
  if (!trimmed) return false;

  const db = session ?? getDb();
  const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
  const needle = normalizePoNumber(trimmed);
  const altLot = trimmed.startsWith("PO-")
    ? trimmed.replace(/^PO-/, "LOT-")
    : trimmed.startsWith("LOT-")
      ? trimmed.replace(/^LOT-/, "PO-")
      : trimmed;

  const conditions = [
    or(
      sql`lower(trim(${purchaseLots.reference})) = ${needle}`,
      sql`lower(trim(${purchaseLots.lotCode})) = ${needle}`,
      sql`lower(trim(${purchaseLots.lotCode})) = ${normalizePoNumber(altLot)}`
    )!,
  ];
  if (resolvedTenantId) {
    conditions.push(eq(purchaseLots.tenantId, resolvedTenantId));
  }

  const rows = await db
    .select({
      receiptUrl: purchaseLots.receiptUrl,
      notes: purchaseLots.notes,
    })
    .from(purchaseLots)
    .where(and(...conditions));

  return rows.some((row) => lotRowHasReceipt(row.receiptUrl, row.notes));
}

const CASH_RELEASE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["pending_approval", "cancelled"],
  pending_approval: ["approved", "cancelled"],
  approved: ["disbursed", "cancelled"],
  disbursed: [],
  completed: [],
  cancelled: [],
};

export function assertCashReleaseTransition(from: string, to: string): void {
  const allowed = CASH_RELEASE_TRANSITIONS[from] ?? [];
  if (allowed.includes(to)) return;
  if (to === "completed") {
    throw new BadRequestError(
      "This record closes when the purchase order receipt is uploaded."
    );
  }
  throw new BadRequestError(
    `Cannot change status from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}.`
  );
}

/**
 * Cash release target. No PO, or a PO that already has a receipt, closes
 * immediately. Otherwise the claim waits at `disbursed`.
 */
export async function resolveCashReleaseStatus(
  poNumber: string | null | undefined,
  tenantId?: string
): Promise<"disbursed" | "completed"> {
  if (!poNumber?.trim()) return "completed";
  if (await poHasReceipt(poNumber, tenantId)) return "completed";
  return "disbursed";
}

const RECEIPT_OPEN_STATUSES = new Set(["disbursed", "completed"]);

export function receiptUploadBlockReason(claim: PoDisbursementClaim | null): string | null {
  if (claim && RECEIPT_OPEN_STATUSES.has(claim.status)) return null;
  if (claim) {
    const label =
      claim.kind === "voucher" ? "disbursement voucher" : "petty cash voucher";
    return `Receipt upload is locked until ${label} ${claim.code} is disbursed.`;
  }
  return "Receipt upload is locked until this purchase order is disbursed on a voucher or petty cash record.";
}

/**
 * Close a disbursed claim when a receipt is saved, or reopen a closed claim
 * when that receipt is removed. Other statuses are left alone.
 */
export async function applyReceiptToDisbursementClaim(args: {
  poNumber: string;
  hasReceipt: boolean;
  tenantId?: string;
  actor: { userId?: string | null; displayName: string };
  session?: DbSession;
}): Promise<void> {
  const claim = await findActivePoDisbursement(args.poNumber, args.tenantId);
  if (!claim) return;

  const nextStatus = args.hasReceipt
    ? claim.status === "disbursed"
      ? "completed"
      : null
    : claim.status === "completed"
      ? "disbursed"
      : null;
  if (!nextStatus) return;

  const db = args.session ?? getDb();
  const resolvedTenantId = args.tenantId ?? getTenantContext()?.tenantId;
  const now = new Date();

  if (claim.kind === "voucher") {
    const conditions = [eq(vouchers.id, claim.id)];
    if (resolvedTenantId) conditions.push(eq(vouchers.tenantId, resolvedTenantId));
    await db
      .update(vouchers)
      .set({ status: nextStatus, updatedAt: now })
      .where(and(...conditions));
  } else {
    const conditions = [eq(pettyCashVouchers.id, claim.id)];
    if (resolvedTenantId) {
      conditions.push(eq(pettyCashVouchers.tenantId, resolvedTenantId));
    }
    await db
      .update(pettyCashVouchers)
      .set({ status: nextStatus, updatedAt: now })
      .where(and(...conditions));
  }

  const entityType = claim.kind === "voucher" ? "voucher" : "petty_cash";
  const note = args.hasReceipt
    ? `Receipt filed on ${args.poNumber.trim()}. Status changed from disbursed to completed.`
    : `Receipt removed from ${args.poNumber.trim()}. Status changed from completed to disbursed.`;

  await new AuditLogService().log(
    {
      entityType,
      entityId: claim.id,
      action: nextStatus,
      actorName: args.actor.displayName,
      actorUserId: args.actor.userId,
      notes: note,
      metadata: {
        previousStatus: claim.status,
        newStatus: nextStatus,
        purchaseOrderNumber: args.poNumber.trim(),
      },
      tenantId: resolvedTenantId,
    },
    args.session
  );

  const tag = claim.kind === "voucher" ? "vouchers" : "petty-cash";
  serverCache.invalidateTag(tag);
  if (resolvedTenantId) {
    serverCache.invalidateTag(`tenant:${resolvedTenantId}:${tag}`);
  }
}

export async function assertPoReceiptUploadAllowed(args: {
  poNumber: string;
  previousReceipt: string | null | undefined;
  nextReceipt: string | null | undefined;
  tenantId?: string;
  actor: { userId?: string | null; displayName: string };
  session?: DbSession;
}): Promise<void> {
  const previous = (args.previousReceipt || "").trim();
  const next = (args.nextReceipt || "").trim();
  if (previous === next) return;

  if (next) {
    const claim = await findActivePoDisbursement(args.poNumber, args.tenantId);
    const reason = receiptUploadBlockReason(claim);
    if (reason) throw new BadRequestError(reason);
  }

  await applyReceiptToDisbursementClaim({
    poNumber: args.poNumber,
    hasReceipt: Boolean(next),
    tenantId: args.tenantId,
    actor: args.actor,
    session: args.session,
  });
}
