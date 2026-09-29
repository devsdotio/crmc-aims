import { and, eq, inArray, sql } from "drizzle-orm";
import type { PurchaseLotRow } from "@/server/db/schema";
import {
  assets,
  consumables,
  departments,
  projectExpenseLines,
  purchaseLots,
  purchaseOrderDepartments,
  stockMovements,
} from "@/server/db/schema";
import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { withTransaction } from "@/server/db/transaction";
import { generateOperationalCode } from "@/server/shared/codes";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/server/shared/errors";
import { encodeLotQr, parseScanPayload } from "@/server/shared/qr";
import type { ActorContext } from "@/server/shared/auth";
import { getTenantContext } from "@/server/shared/tenant-context";
import { SupplierRepository } from "@/server/modules/suppliers/supplier.repository";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";
import { AssetModelRepository } from "@/server/modules/assets/asset.model.repository";
import { assetCategoryCodePrefix } from "@/lib/asset-category";
import { hasPoJustification } from "@/lib/po-purpose";

import { PurchaseLotRepository } from "./purchase-lot.repository";
import {
  findActivePoDisbursement,
  listActivePoDisbursements,
} from "./po-disbursement";
import {
  deletePoDepartmentLinks,
  renamePoDepartmentLinks,
} from "./po-departments";
import {
  computePoDeleteImpact,
  deletePurchaseOrderWithRevert,
} from "./purchase-lot-delete-impact";
import type {
  AddPurchaseOrderLinesInput,
  CreatePurchaseLotInput,
  CreatePurchaseOrderInput,
  PoDeleteImpact,
  PurchaseLotDTO,
  PurchaseOrderStatus,
  UpdatePurchaseOrderInput,
  UpdatePurchaseOrderStatusInput,
} from "./purchase-lot.types";
import {
  addPurchaseOrderLinesSchema,
  createPurchaseOrderSchema,
  listPurchaseLotsQuerySchema,
  purchaseLotIdSchema,
  updatePurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
} from "./purchase-lot.validation";

function formatMoney(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function padAssetSeq(n: number, width = 3): string {
  return String(n).padStart(width, "0");
}

function byTenantId<T>(column: T, tenantId?: string | null) {
  return tenantId ? eq(column as typeof consumables.tenantId, tenantId) : undefined;
}

/** PO-level placeholder when line items have different dealers — never store on a lot/item. */
function isAggregateSupplierLabel(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === "multiple suppliers" ||
    n.startsWith("multiple suppliers") ||
    /^multiple\s*\(\d+\)$/.test(n)
  );
}

export type LotCostAllocation = {
  lotId: string | null;
  lotCode: string | null;
  quantity: number;
  unitCost: string;
  total: string;
  supplierId?: string | null;
  supplierName?: string | null;
  uncosted?: boolean;
};

export function derivePONumber(lotCode: string, reference?: string | null): string {
  if (reference && reference.trim()) {
    const trimmed = reference.trim();
    const lower = trimmed.toLowerCase();
    // Opening-balance / initial-stock lots are not formal POs — keep a clear label
    // so PO indexes can exclude them and item detail can show "Opening balance".
    if (
      lower === "initial stock" ||
      lower.startsWith("initial stock") ||
      lower === "opening balance" ||
      lower.startsWith("opening balance")
    ) {
      return "Opening balance";
    }
    return trimmed;
  }
  return lotCode.startsWith("LOT-")
    ? lotCode.replace(/^LOT-/, "PO-")
    : lotCode.startsWith("PO-")
    ? lotCode
    : `PO-${lotCode}`;
}

export function deriveLotCode(lotCode: string): string {
  return lotCode.startsWith("PO-") ? lotCode.replace(/^PO-/, "LOT-") : lotCode;
}

/** Specs for a catalog item deferred until PO delivery. */
export type DraftItemSpecs = {
  category?: string | null;
  classification?: "supply" | "material" | null;
  unit?: string | null;
  minThreshold?: number | null;
  location?: string | null;
  assignmentType?: "borrowable" | "assignable" | null;
};

function parseDraftItem(raw: unknown): DraftItemSpecs | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const classification =
    d.classification === "supply" || d.classification === "material"
      ? d.classification
      : null;
  const assignmentType =
    d.assignmentType === "borrowable" || d.assignmentType === "assignable"
      ? d.assignmentType
      : null;
  return {
    category: typeof d.category === "string" ? d.category : null,
    classification,
    unit: typeof d.unit === "string" ? d.unit : null,
    minThreshold:
      typeof d.minThreshold === "number" && Number.isFinite(d.minThreshold)
        ? d.minThreshold
        : null,
    location: typeof d.location === "string" ? d.location : null,
    assignmentType,
  };
}

export function parseNotesMetadata(rawNotes?: string | null): {
  cleanNotes: string | null;
  status: PurchaseOrderStatus;
  purpose: string | null;
  receiptUrl: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  orderedAt: string | null;
  deliveredAt: string | null;
  orderedQuantity: number | null;
  receivedQuantity: number | null;
  cancellationReason: string | null;
  draftItem: DraftItemSpecs | null;
} {
  // Default must NOT be "delivered" — that silently skips stock intake on receive.
  let status: PurchaseOrderStatus = "pending_approval";
  let purpose: string | null = null;
  let receiptUrl: string | null = null;
  let approvedByName: string | null = null;
  let approvedAt: string | null = null;
  let orderedAt: string | null = null;
  let deliveredAt: string | null = null;
  let orderedQuantity: number | null = null;
  let receivedQuantity: number | null = null;
  let cancellationReason: string | null = null;
  let draftItem: DraftItemSpecs | null = null;
  let cleanNotes = rawNotes ?? null;

  if (rawNotes) {
    const trimmedNotes = rawNotes.trim();
    if (trimmedNotes.startsWith("{") && trimmedNotes.includes('"status"')) {
      try {
        const meta = JSON.parse(trimmedNotes);
        if (meta.status) status = meta.status;
        if (meta.purpose) purpose = meta.purpose;
        if (meta.receiptUrl) receiptUrl = meta.receiptUrl;
        if (meta.approvedByName) approvedByName = meta.approvedByName;
        if (meta.approvedAt) approvedAt = meta.approvedAt;
        if (meta.orderedAt) orderedAt = meta.orderedAt;
        if (meta.deliveredAt) deliveredAt = meta.deliveredAt;
        if (typeof meta.orderedQuantity === "number") {
          orderedQuantity = meta.orderedQuantity;
        }
        if (typeof meta.receivedQuantity === "number") {
          receivedQuantity = meta.receivedQuantity;
        }
        if (typeof meta.cancellationReason === "string" && meta.cancellationReason.trim()) {
          cancellationReason = meta.cancellationReason.trim();
        }
        if (meta.draftItem) {
          draftItem = parseDraftItem(meta.draftItem);
        }
        cleanNotes = meta.notes ?? null;
      } catch {
        // use raw
      }
    } else {
      const statusMatch = rawNotes.match(/\[STATUS:\s*([a-z_]+)\]/i);
      if (
        statusMatch &&
        ["pending_approval", "approved", "ordered", "delivered", "cancelled"].includes(
          statusMatch[1].toLowerCase()
        )
      ) {
        status = statusMatch[1].toLowerCase() as PurchaseOrderStatus;
      }
      const purposeMatch = rawNotes.match(/\[PURPOSE:\s*([^\]]+)\]/i);
      if (purposeMatch) {
        purpose = purposeMatch[1].trim();
      }
      const receiptMatch = rawNotes.match(/\[RECEIPT_URL:\s*([^\]]+)\]/i);
      if (receiptMatch) {
        receiptUrl = receiptMatch[1].trim();
      }
      const approvedMatch = rawNotes.match(/\[APPROVED_BY:\s*([^\]]+)\]/i);
      if (approvedMatch) {
        approvedByName = approvedMatch[1].trim();
      }
    }
  }

  return {
    cleanNotes,
    status,
    purpose,
    receiptUrl,
    approvedByName,
    approvedAt,
    orderedAt,
    deliveredAt,
    orderedQuantity,
    receivedQuantity,
    cancellationReason,
    draftItem,
  };
}

export function serializeNotesMetadata(data: {
  notes?: string | null;
  status: PurchaseOrderStatus;
  purpose?: string | null;
  receiptUrl?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  orderedAt?: string | null;
  deliveredAt?: string | null;
  orderedQuantity?: number | null;
  receivedQuantity?: number | null;
  cancellationReason?: string | null;
  draftItem?: DraftItemSpecs | null;
}): string {
  const payload: Record<string, unknown> = {
    notes: data.notes || "",
    status: data.status,
    purpose: data.purpose || "",
    receiptUrl: data.receiptUrl || null,
    approvedByName: data.approvedByName || null,
    approvedAt: data.approvedAt || null,
    orderedAt: data.orderedAt || null,
    deliveredAt: data.deliveredAt || null,
    orderedQuantity:
      typeof data.orderedQuantity === "number" ? data.orderedQuantity : null,
    receivedQuantity:
      typeof data.receivedQuantity === "number" ? data.receivedQuantity : null,
    cancellationReason: data.cancellationReason?.trim() || null,
  };
  if (data.draftItem) {
    payload.draftItem = data.draftItem;
  }
  return JSON.stringify(payload);
}

export function toPurchaseLotDTO(row: PurchaseLotRow): PurchaseLotDTO {
  const poNumber = derivePONumber(row.lotCode, row.reference);
  const lotCode = deriveLotCode(row.lotCode);
  const meta = parseNotesMetadata(row.notes);

  return {
    id: row.id,
    poNumber,
    lotCode,
    status: meta.status,
    itemType: row.itemType,
    consumableId: row.consumableId ?? null,
    assetId: row.assetId ?? null,
    itemCode: row.itemCode,
    itemName: row.itemName,
    supplierId: row.supplierId ?? null,
    supplierName: row.supplierName ?? null,
    quantity: row.quantity,
    quantityRemaining: row.quantityRemaining,
    orderedQuantity: meta.orderedQuantity ?? row.quantity,
    receivedQuantity: meta.receivedQuantity ?? null,
    unitCost: formatMoney(row.unitCost),
    totalCost: formatMoney(row.totalCost),
    purchasedOn: row.purchasedOn,
    reference: row.reference ?? null,
    purpose: meta.purpose,
    departmentId: row.departmentId ?? null,
    departmentName: row.departmentName ?? null,
    projectId: row.projectId ?? null,
    projectName: row.projectName ?? null,
    notes: meta.cleanNotes,
    receiptUrl: row.receiptUrl || meta.receiptUrl || null,
    recordedByUserId: row.recordedByUserId,
    recordedByName: row.recordedByName,
    approvedByName: meta.approvedByName,
    approvedAt: meta.approvedAt,
    orderedAt: meta.orderedAt,
    deliveredAt: meta.deliveredAt,
    cancellationReason: meta.cancellationReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    qrPayload: encodeLotQr(lotCode),
    disbursement: null,
  };
}

async function withDisbursementClaims(
  dtos: PurchaseLotDTO[],
  tenantId?: string
): Promise<PurchaseLotDTO[]> {
  if (dtos.length === 0) return dtos;
  const claims = await listActivePoDisbursements(tenantId);
  return dtos.map((dto) => {
    const claim = claims.get(dto.poNumber.trim().toLowerCase()) ?? null;
    return {
      ...dto,
      disbursement: claim
        ? {
            kind: claim.kind,
            id: claim.id,
            code: claim.code,
            status: claim.status,
          }
        : null,
    };
  });
}

/**
 * Attach sponsoring departments from purchase_order_departments.
 * Falls back to the scalar departmentId/Name on the lot when no join rows exist.
 */
async function withPoDepartments(
  dtos: PurchaseLotDTO[],
  tenantId?: string,
  session?: DbSession
): Promise<PurchaseLotDTO[]> {
  if (dtos.length === 0) return dtos;

  const poNumbers = [
    ...new Set(
      dtos
        .filter((d) => Boolean(d.poNumber?.trim()))
        .map((d) => d.poNumber.trim())
    ),
  ];
  if (poNumbers.length === 0) return dtos;

  const db = session ?? getDb();
  const conditions = [
    inArray(purchaseOrderDepartments.poReference, poNumbers),
  ];
  if (tenantId) {
    conditions.push(eq(purchaseOrderDepartments.tenantId, tenantId));
  }

  const rows = await db
    .select({
      poReference: purchaseOrderDepartments.poReference,
      departmentId: purchaseOrderDepartments.departmentId,
      departmentName: departments.name,
    })
    .from(purchaseOrderDepartments)
    .innerJoin(
      departments,
      eq(departments.id, purchaseOrderDepartments.departmentId)
    )
    .where(and(...conditions));

  const byPo = new Map<string, Array<{ id: string; name: string }>>();
  for (const row of rows) {
    const key = row.poReference.trim().toLowerCase();
    const list = byPo.get(key) ?? [];
    if (!list.some((d) => d.id === row.departmentId)) {
      list.push({ id: row.departmentId, name: row.departmentName });
    }
    byPo.set(key, list);
  }

  return dtos.map((dto) => {
    const fromJoin = byPo.get(dto.poNumber.trim().toLowerCase());
    if (fromJoin && fromJoin.length > 0) {
      return { ...dto, departments: fromJoin };
    }
    if (dto.departmentId && dto.departmentName) {
      return {
        ...dto,
        departments: [{ id: dto.departmentId, name: dto.departmentName }],
      };
    }
    return dto;
  });
}

export class PurchaseLotService {
  private readonly auditLogs = new AuditLogService();
  private readonly assetModels = new AssetModelRepository();

  constructor(
    private readonly repo = new PurchaseLotRepository(),
    private readonly suppliers = new SupplierRepository()
  ) {}

  private async nextCategoryAssetCode(
    category: string,
    session: DbSession,
    tenantId?: string
  ): Promise<string> {
    const prefix = assetCategoryCodePrefix(category || "Equipment");
    const seq = await this.assetModels.firstAvailableSequenceForPrefix(
      prefix,
      session,
      tenantId
    );
    return `${prefix}-${padAssetSeq(seq)}`;
  }

  async list(rawQuery: unknown, actorTenantId?: string): Promise<PurchaseLotDTO[]> {
    const filters = listPurchaseLotsQuerySchema.parse(rawQuery ?? {});
    // Flat list — never strips opening-balance / initial-stock lots.
    // PO index UIs exclude those via groupLotsByPO({ excludeInitialStock: true }).
    const rows = await this.repo.list(filters, undefined, actorTenantId);
    let dtos = rows.map(toPurchaseLotDTO);

    const statusSet =
      filters.statuses && filters.statuses.length > 0
        ? new Set(filters.statuses)
        : filters.status
          ? new Set([filters.status])
          : null;
    if (statusSet) {
      dtos = dtos.filter((d) => statusSet.has(d.status));
    }

    // Cap by distinct PO so multi-line orders stay complete for lean widgets.
    if (filters.limit && filters.limit > 0) {
      const order: string[] = [];
      const byPo = new Map<string, typeof dtos>();
      for (const dto of dtos) {
        const key = dto.poNumber || dto.lotCode;
        const existing = byPo.get(key);
        if (existing) {
          existing.push(dto);
          continue;
        }
        if (order.length >= filters.limit) continue;
        order.push(key);
        byPo.set(key, [dto]);
      }
      dtos = order.flatMap((key) => byPo.get(key) ?? []);
    }

    dtos = await withPoDepartments(dtos, actorTenantId);
    return withDisbursementClaims(dtos, actorTenantId);
  }

  async getById(rawId: string, actorTenantId?: string): Promise<PurchaseLotDTO> {
    const id = purchaseLotIdSchema.parse(rawId);
    const row = await this.repo.findById(id, undefined, actorTenantId);
    if (!row) throw new NotFoundError("Purchase lot / PO", id);
    const withDepts = await withPoDepartments(
      [toPurchaseLotDTO(row)],
      actorTenantId
    );
    const [dto] = await withDisbursementClaims(withDepts, actorTenantId);
    return dto;
  }

  async getByCode(rawCode: string, actorTenantId?: string): Promise<PurchaseLotDTO> {
    const parsed = parseScanPayload(rawCode);
    if (!parsed.code) {
      throw new BadRequestError("Lot / PO code is required.");
    }
    const row = await this.repo.findByLotCode(parsed.code, undefined, actorTenantId);
    if (!row) throw new NotFoundError("Purchase lot / PO", parsed.code);
    const withDepts = await withPoDepartments(
      [toPurchaseLotDTO(row)],
      actorTenantId
    );
    const [dto] = await withDisbursementClaims(withDepts, actorTenantId);
    return dto;
  }

  /**
   * Main CRUD: File New Purchase Order (Multi-line items, stock selection or new item creation).
   */
  async createPurchaseOrder(
    rawBody: unknown,
    actor: ActorContext
  ): Promise<PurchaseLotDTO[]> {
    const body: CreatePurchaseOrderInput = createPurchaseOrderSchema.parse(rawBody);
    const poNumber = body.poNumber?.trim() || generateOperationalCode("PO");

    if (body.poNumber?.trim()) {
      const existing = await this.repo.findByLotCode(
        body.poNumber.trim(),
        undefined,
        actor.tenantId
      );
      if (existing) {
        throw new ConflictError(
          `PO number "${body.poNumber.trim()}" already exists. Open the existing purchase order to add, edit, or delete line items, or choose a different number.`
        );
      }
    }

    return withTransaction(async (session) => {
      const results: PurchaseLotDTO[] = [];
      const db = session ?? getDb();

      let resolvedSupplierName = body.supplierName?.trim() || null;
      const supplierId = body.supplierId ?? null;

      if (supplierId) {
        const sup = await this.suppliers.findById(
          supplierId,
          session,
          actor.tenantId
        );
        if (sup) {
          resolvedSupplierName = sup.name;
        }
      }
      // Body may carry a UI aggregate label when dealers differ — never use that on lots/stock.
      if (isAggregateSupplierLabel(resolvedSupplierName)) {
        resolvedSupplierName = null;
      }

      const initialStatus: PurchaseOrderStatus = body.status || "pending_approval";
      const nowIso = new Date().toISOString();

      const isProjectPo = Boolean(body.projectId);
      const requestedDepartmentIds = [
        ...new Set(
          (body.departmentIds && body.departmentIds.length > 0
            ? body.departmentIds
            : body.departmentId
              ? [body.departmentId]
              : []
          ).filter(Boolean)
        ),
      ];

      let departmentId = body.departmentId ?? null;
      let departmentName = body.departmentName?.trim() || null;
      let poDepartments: Array<{ id: string; name: string }> = [];

      if (isProjectPo && requestedDepartmentIds.length < 1) {
        throw new BadRequestError(
          "At least one target department is required for project purchase orders."
        );
      }

      if (requestedDepartmentIds.length > 0) {
        const deptRows = await db
          .select({
            id: departments.id,
            name: departments.name,
          })
          .from(departments)
          .where(
            and(
              inArray(departments.id, requestedDepartmentIds),
              actor.tenantId
                ? eq(departments.tenantId, actor.tenantId)
                : undefined
            )
          );
        const byId = new Map(deptRows.map((d) => [d.id, d.name]));
        for (const id of requestedDepartmentIds) {
          const name = byId.get(id);
          if (!name) {
            throw new NotFoundError("Department", id);
          }
          poDepartments.push({ id, name });
        }
        departmentId = poDepartments[0]?.id ?? null;
        departmentName = poDepartments[0]?.name ?? null;

        await db.insert(purchaseOrderDepartments).values(
          poDepartments.map((d) => ({
            tenantId: actor.tenantId,
            poReference: poNumber,
            departmentId: d.id,
          }))
        );
      }

      const approvedByName =
        initialStatus === "approved" || initialStatus === "delivered"
          ? actor.displayName
          : null;
      const approvedAt =
        initialStatus === "approved" || initialStatus === "delivered"
          ? nowIso
          : null;
      const orderedAt =
        initialStatus === "ordered" || initialStatus === "delivered"
          ? nowIso
          : null;
      const deliveredAt = initialStatus === "delivered" ? nowIso : null;

      for (const item of body.items) {
        let consumableId: string | null = item.consumableId ?? null;
        let assetId: string | null = item.assetId ?? null;
        let itemCode = "";
        let itemName = item.name.trim();
        /** Deferred catalog specs when filing a new item before delivery. */
        let draftItem: DraftItemSpecs | null = null;

        const targetProjectId = item.projectId || body.projectId || null;
        const targetProjectName = item.projectName || body.projectName || null;

        // Prefer the line item's own dealer; fall back to PO-level only when it is a real vendor.
        let lineSupplierId = item.supplierId ?? null;
        let lineSupplierName = item.suggestedDealer?.trim() || null;
        if (lineSupplierId) {
          const lineSup = await this.suppliers.findById(
            lineSupplierId,
            session,
            actor.tenantId
          );
          if (lineSup) lineSupplierName = lineSup.name;
        }
        if (!lineSupplierName && resolvedSupplierName) {
          lineSupplierName = resolvedSupplierName;
        }
        if (!lineSupplierId && supplierId && resolvedSupplierName) {
          lineSupplierId = supplierId;
        }
        if (isAggregateSupplierLabel(lineSupplierName)) {
          lineSupplierName = item.suggestedDealer?.trim() || null;
        }

        // 1. Handle Consumable
        if (item.itemType === "consumable") {
          if (consumableId) {
            const [existing] = await db
              .select()
              .from(consumables)
              .where(
                and(
                  eq(consumables.id, consumableId),
                  byTenantId(consumables.tenantId, actor.tenantId)
                )
              )
              .limit(1);
            if (!existing) {
              throw new NotFoundError("Consumable", consumableId);
            }
            itemCode = existing.itemCode;
            itemName = existing.name;

            // Auto-classify as material if destined for a project
            if (targetProjectId && existing.classification !== "material") {
              await db
                .update(consumables)
                .set({ classification: "material", updatedAt: new Date() })
                .where(
                  and(
                    eq(consumables.id, consumableId),
                    byTenantId(consumables.tenantId, actor.tenantId)
                  )
                );
            }

            // If created directly in "delivered" state
            if (initialStatus === "delivered") {
              if (targetProjectId) {
                // Auto-issue movement for direct project material delivery (currentQty unchanged)
                await db.insert(stockMovements).values({
                  tenantId: actor.tenantId,
                  movementCode: generateOperationalCode("MOV"),
                  consumableId,
                  projectId: targetProjectId,
                  qty: item.quantity,
                  direction: "out",
                  reason: "issue",
                  unitCost: formatMoney(item.unitCost),
                  lineTotal: formatMoney(Number(item.unitCost) * item.quantity),
                  notes: `Direct project delivery to ${targetProjectName || "Project"} via PO ${poNumber}`,
                  actorUserId: actor.userId,
                  actorName: actor.displayName,
                });
                await db.insert(projectExpenseLines).values({
                  tenantId: actor.tenantId,
                  projectId: targetProjectId,
                  lineType: "material",
                  category: "miscellaneous",
                  description: `${itemName} (${item.quantity} × ₱${Number(item.unitCost).toFixed(2)}) [PO: ${poNumber}]`,
                  amount: formatMoney(Number(item.unitCost) * item.quantity),
                  quantity: String(item.quantity),
                  unitCost: String(Number(item.unitCost).toFixed(2)),
                  consumableId,
                  incurredOn: body.poDate || new Date().toISOString().slice(0, 10),
                  notes: `Auto-credited upon PO ${poNumber} creation. Supplier: ${lineSupplierName || "—"}`,
                  recordedByUserId: actor.userId,
                  recordedByName: actor.displayName,
                  metadata: {
                    poNumber,
                    supplierName: lineSupplierName,
                    directProjectDelivery: true,
                  },
                });
              } else {
                await db
                  .update(consumables)
                  .set({
                    currentQty: existing.currentQty + item.quantity,
                    lastRestocked: new Date(),
                    updatedAt: new Date(),
                    ...(lineSupplierName ? { supplier: lineSupplierName } : {}),
                  })
                  .where(
                    and(
                      eq(consumables.id, consumableId),
                      byTenantId(consumables.tenantId, actor.tenantId)
                    )
                  );

                // Record stock movement
                await db.insert(stockMovements).values({
                  tenantId: actor.tenantId,
                  movementCode: generateOperationalCode("MOV"),
                  consumableId,
                  qty: item.quantity,
                  direction: "in",
                  reason: "restock",
                  unitCost: formatMoney(item.unitCost),
                  lineTotal: formatMoney(Number(item.unitCost) * item.quantity),
                  notes: `PO Received: ${poNumber}`,
                  actorUserId: actor.userId,
                  actorName: actor.displayName,
                });
              }
            }
          } else if (initialStatus === "delivered") {
            // New consumable minted immediately only when PO is filed as delivered
            const [nameClash] = await db
              .select()
              .from(consumables)
              .where(
                and(
                  sql`lower(${consumables.name}) = ${itemName.toLowerCase()}`,
                  actor.tenantId
                    ? eq(consumables.tenantId, actor.tenantId)
                    : undefined
                )
              )
              .limit(1);
            if (nameClash) {
              throw new ConflictError(
                `Consumable "${itemName}" already exists as ${nameClash.itemCode}. Select it from the catalog instead of creating a new item.`
              );
            }

            itemCode = generateOperationalCode("ITM");
            const itemClassification =
              item.classification || (targetProjectId ? "material" : "supply");
            const initialQty = !targetProjectId ? item.quantity : 0;

            const [newConsumable] = await db
              .insert(consumables)
              .values({
                tenantId: actor.tenantId,
                itemCode,
                name: itemName,
                category: item.category || "General Supply",
                classification: itemClassification,
                unit: item.unit || "pcs",
                currentQty: initialQty,
                minThreshold: item.minThreshold ?? 5,
                location: item.location || "Main Property Storage",
                supplier: lineSupplierName || undefined,
                lastRestocked: !targetProjectId ? new Date() : undefined,
                notes: body.notes,
              })
              .returning();
            consumableId = newConsumable.id;

            if (targetProjectId) {
              // Auto-issue movement for direct project material delivery
              await db.insert(stockMovements).values({
                tenantId: actor.tenantId,
                movementCode: generateOperationalCode("MOV"),
                consumableId,
                projectId: targetProjectId,
                qty: item.quantity,
                direction: "out",
                reason: "issue",
                unitCost: formatMoney(item.unitCost),
                lineTotal: formatMoney(Number(item.unitCost) * item.quantity),
                notes: `Direct project delivery to ${targetProjectName || "Project"} via PO ${poNumber}`,
                actorUserId: actor.userId,
                actorName: actor.displayName,
              });
              await db.insert(projectExpenseLines).values({
                tenantId: actor.tenantId,
                projectId: targetProjectId,
                lineType: "material",
                category: "miscellaneous",
                description: `${itemName} (${item.quantity} × ₱${Number(item.unitCost).toFixed(2)}) [PO: ${poNumber}]`,
                amount: formatMoney(Number(item.unitCost) * item.quantity),
                quantity: String(item.quantity),
                unitCost: String(Number(item.unitCost).toFixed(2)),
                consumableId,
                incurredOn: body.poDate || new Date().toISOString().slice(0, 10),
                notes: `Auto-credited upon PO ${poNumber} creation. Supplier: ${lineSupplierName || "—"}`,
                recordedByUserId: actor.userId,
                recordedByName: actor.displayName,
                metadata: {
                  poNumber,
                  supplierName: lineSupplierName,
                  directProjectDelivery: true,
                },
              });
            } else {
              await db.insert(stockMovements).values({
                tenantId: actor.tenantId,
                movementCode: generateOperationalCode("MOV"),
                consumableId,
                qty: item.quantity,
                direction: "in",
                reason: "restock",
                unitCost: formatMoney(item.unitCost),
                lineTotal: formatMoney(Number(item.unitCost) * item.quantity),
                notes: `PO Initial Intake: ${poNumber}`,
                actorUserId: actor.userId,
                actorName: actor.displayName,
              });
            }
          } else {
            // Defer catalog insert until delivery — lot holds draft specs only
            itemCode = generateOperationalCode("ITM");
            consumableId = null;
            draftItem = {
              category: item.category || "General Supply",
              classification:
                item.classification || (targetProjectId ? "material" : "supply"),
              unit: item.unit || "pcs",
              minThreshold: item.minThreshold ?? 5,
              location: item.location || "Main Property Storage",
            };
          }
        }

        // 2. Handle Fixed Asset
        if (item.itemType === "asset") {
          if (assetId) {
            const [existing] = await db
              .select()
              .from(assets)
              .where(
                and(
                  eq(assets.id, assetId),
                  byTenantId(assets.tenantId, actor.tenantId)
                )
              )
              .limit(1);
            if (!existing) {
              throw new NotFoundError("Asset", assetId);
            }
            itemCode = existing.assetCode;
            itemName = existing.name;
          } else if (initialStatus === "delivered") {
            // New asset(s) minted immediately only when PO is filed as delivered
            const [nameClash] = await db
              .select()
              .from(assets)
              .where(
                and(
                  sql`lower(${assets.name}) = ${itemName.toLowerCase()}`,
                  actor.tenantId
                    ? eq(assets.tenantId, actor.tenantId)
                    : undefined
                )
              )
              .limit(1);
            if (nameClash) {
              throw new ConflictError(
                `Asset "${itemName}" already exists as ${nameClash.assetCode}. Select it from the catalog instead of creating a new item.`
              );
            }

            const unitsToCreate = Math.max(1, item.quantity);
            let firstCode = "";
            let firstId: string | null = null;

            for (let i = 0; i < unitsToCreate; i++) {
              const code = await this.nextCategoryAssetCode(
                item.category || "Equipment",
                session,
                actor.tenantId
              );
              const [newAsset] = await db
                .insert(assets)
                .values({
                  tenantId: actor.tenantId,
                  assetCode: code,
                  name: itemName,
                  category: item.category || "Equipment",
                  status: "active",
                  assignmentType: item.assignmentType || "borrowable",
                  location: item.location || "Property Custodian Depot",
                  purchaseDate: body.poDate,
                  value: formatMoney(item.unitCost),
                  supplierId: lineSupplierId || undefined,
                  notes: `Acquired via PO ${poNumber}${
                    unitsToCreate > 1 ? ` (unit ${i + 1}/${unitsToCreate})` : ""
                  }`,
                })
                .returning();

              if (!firstId) {
                firstId = newAsset.id;
                firstCode = newAsset.assetCode;
              }
            }

            assetId = firstId;
            itemCode = firstCode;
          } else {
            // Defer catalog insert until delivery — lot holds draft specs only
            itemCode = generateOperationalCode("ITM");
            assetId = null;
            draftItem = {
              category: item.category || "Equipment",
              location: item.location || "Property Custodian Depot",
              assignmentType: item.assignmentType || "borrowable",
            };
          }
        }

        const unitCost = formatMoney(item.unitCost);
        const totalCost = formatMoney(Number(unitCost) * item.quantity);
        const lotCode = generateOperationalCode("PO");

        // Prefer per-line purpose (multi-purpose POs); fall back to body header.
        const lotPurposeRaw = (item.purpose || body.purpose || "").trim();
        const lotPurpose =
          departmentName && lotPurposeRaw && !lotPurposeRaw.startsWith("[")
            ? `[${departmentName}] ${lotPurposeRaw}`.trim()
            : lotPurposeRaw || null;
        if (!lotPurpose || !hasPoJustification(lotPurpose)) {
          throw new BadRequestError("Procurement purpose is required for every line item.");
        }

        const serializedNotes = serializeNotesMetadata({
          notes: body.notes,
          status: initialStatus,
          purpose: lotPurpose,
          receiptUrl: body.receiptUrl,
          approvedByName,
          approvedAt,
          orderedAt,
          deliveredAt,
          draftItem,
        });

        const row = await this.repo.create(
          {
            tenantId: actor.tenantId,
            lotCode,
            itemType: item.itemType,
            consumableId,
            assetId,
            itemCode,
            itemName,
            supplierId: lineSupplierId,
            supplierName: lineSupplierName,
            departmentId,
            departmentName,
            projectId: targetProjectId,
            projectName: targetProjectName,
            quantity: item.quantity,
            quantityRemaining: initialStatus === "delivered" ? (targetProjectId ? 0 : item.quantity) : 0,
            unitCost,
            totalCost,
            purchasedOn: body.poDate,
            reference: poNumber,
            notes: serializedNotes,
            receiptUrl: body.receiptUrl || null,
            recordedByUserId: actor.userId,
            recordedByName: body.requestedBy || actor.displayName,
          },
          session
        );

        const dto = toPurchaseLotDTO(row);
        if (poDepartments.length > 0) {
          dto.departments = poDepartments;
        }
        results.push(dto);
      }

      await this.auditLogs.log(
        {
          entityType: AUDIT_ENTITY.purchaseOrder,
          entityId: poNumber,
          action: "purchase_order_created",
          actorName: actor.displayName,
          actorUserId: actor.userId,
          notes: `Generated Purchase Order ${poNumber} with ${body.items.length} line item(s) (Status: ${initialStatus}).`,
          metadata: {
            poNumber,
            status: initialStatus,
            itemCount: body.items.length,
            totalCost: results.reduce((sum, r) => sum + parseFloat(r.totalCost), 0).toFixed(2),
            supplierName:
              resolvedSupplierName ||
              results.map((r) => r.supplierName).filter(Boolean)[0] ||
              null,
          },
        },
        session
      );

      return results;
    });
  }

  /**
   * Transition Workflow Status (Pending Approval -> Approved -> Ordered -> Delivered -> Cancelled).
   */
  async updatePOStatus(
    id: string,
    rawBody: unknown,
    actor: ActorContext
  ): Promise<PurchaseLotDTO> {
    const body: UpdatePurchaseOrderStatusInput = updatePurchaseOrderStatusSchema.parse(
      rawBody
    );

    return withTransaction(async (session) => {
      const db = session ?? getDb();
      const lot = await this.repo.findByIdForUpdate(id, session, actor.tenantId);
      if (!lot) {
        throw new NotFoundError("Purchase Order lot", id);
      }

      const currentMeta = parseNotesMetadata(lot.notes);
      const nextStatus = body.status;
      const nowIso = new Date().toISOString();

      const approvedByName =
        nextStatus === "approved" || nextStatus === "delivered"
          ? body.approvedBy || currentMeta.approvedByName || actor.displayName
          : currentMeta.approvedByName;
      const approvedAt =
        (nextStatus === "approved" || nextStatus === "delivered") &&
        !currentMeta.approvedAt
          ? nowIso
          : currentMeta.approvedAt;
      const orderedAt =
        (nextStatus === "ordered" || nextStatus === "delivered") &&
        !currentMeta.orderedAt
          ? nowIso
          : currentMeta.orderedAt;
      const deliveredAt =
        nextStatus === "delivered" && !currentMeta.deliveredAt
          ? nowIso
          : currentMeta.deliveredAt;

      // Handle Delivery Stock Intake if transitioning to delivered for the first time
      let nextRemaining = lot.quantityRemaining;
      let nextQuantity = lot.quantity;
      let receivedQtyForMeta: number | null = currentMeta.receivedQuantity;
      let orderedQtyForMeta: number | null = currentMeta.orderedQuantity;
      let nextAssetId = lot.assetId;
      let nextConsumableId = lot.consumableId;
      let nextItemCode = lot.itemCode;

      if (nextStatus === "delivered" && currentMeta.status !== "delivered") {
        const orderedQty = currentMeta.orderedQuantity ?? lot.quantity;
        const receivedQty =
          typeof body.receivedQuantity === "number"
            ? body.receivedQuantity
            : orderedQty;

        if (receivedQty < 1) {
          throw new BadRequestError("Received quantity must be at least 1.");
        }

        // Stocked qty becomes the lot quantity so remaining/issue math stays coherent.
        nextQuantity = receivedQty;
        nextRemaining = receivedQty;
        orderedQtyForMeta = orderedQty;
        receivedQtyForMeta = receivedQty;

        const poNumber = derivePONumber(lot.lotCode, lot.reference);
        const unit = Number(lot.unitCost) || 0;
        const lineTotal = formatMoney(unit * receivedQty);
        const draft = currentMeta.draftItem;

        if (lot.itemType === "consumable") {
          let consumableId = lot.consumableId;

          if (!consumableId) {
            // Mint catalog row from deferred draft specs (or sensible defaults)
            const [nameClash] = await db
              .select()
              .from(consumables)
              .where(
                and(
                  sql`lower(${consumables.name}) = ${lot.itemName.toLowerCase()}`,
                  lot.tenantId
                    ? eq(consumables.tenantId, lot.tenantId)
                    : undefined
                )
              )
              .limit(1);
            if (nameClash) {
              throw new ConflictError(
                `Consumable "${lot.itemName}" already exists as ${nameClash.itemCode}. Select it from the catalog instead of creating a new item.`
              );
            }

            const itemCode = generateOperationalCode("ITM");
            const itemClassification =
              draft?.classification ||
              (lot.projectId ? "material" : "supply");
            const [newConsumable] = await db
              .insert(consumables)
              .values({
                tenantId: lot.tenantId,
                itemCode,
                name: lot.itemName,
                category: draft?.category || "General Supply",
                classification: itemClassification,
                unit: draft?.unit || "pcs",
                currentQty: 0,
                minThreshold: draft?.minThreshold ?? 5,
                location: draft?.location || "Main Property Storage",
                supplier:
                  lot.supplierName && !isAggregateSupplierLabel(lot.supplierName)
                    ? lot.supplierName
                    : undefined,
              })
              .returning();

            consumableId = newConsumable.id;
            nextConsumableId = newConsumable.id;
            nextItemCode = newConsumable.itemCode;
          }

          const [consumable] = await db
            .select()
            .from(consumables)
            .where(
              and(
                eq(consumables.id, consumableId),
                byTenantId(consumables.tenantId, lot.tenantId ?? actor.tenantId)
              )
            )
            .for("update")
            .limit(1);

          if (!consumable) {
            throw new NotFoundError("Consumable", consumableId);
          }

          if (lot.projectId) {
            // Dual credit: intake to materials catalog, then auto-issue to project.
            // Net on-hand stays flat; ledger + project expense reflect the delivery.
            nextRemaining = 0;

            if (consumable.classification !== "material") {
              await db
                .update(consumables)
                .set({
                  classification: "material",
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(consumables.id, consumableId),
                    byTenantId(consumables.tenantId, lot.tenantId ?? actor.tenantId)
                  )
                );
            }

            await db
              .update(consumables)
              .set({
                currentQty: sql`${consumables.currentQty} + ${receivedQty}`,
                lastRestocked: new Date(),
                updatedAt: new Date(),
                ...(lot.supplierName && !isAggregateSupplierLabel(lot.supplierName)
                  ? { supplier: lot.supplierName }
                  : {}),
              })
              .where(
                and(
                  eq(consumables.id, consumableId),
                  byTenantId(consumables.tenantId, lot.tenantId ?? actor.tenantId)
                )
              );

            await db.insert(stockMovements).values({
              tenantId: lot.tenantId,
              movementCode: generateOperationalCode("MOV"),
              consumableId,
              purchaseLotId: lot.id,
              lotCode: lot.lotCode,
              qty: receivedQty,
              direction: "in",
              reason: "restock",
              unitCost: lot.unitCost,
              lineTotal,
              notes: `PO ${poNumber} received into materials before project issue`,
              actorUserId: actor.userId,
              actorName: actor.displayName,
            });

            await db
              .update(consumables)
              .set({
                currentQty: sql`${consumables.currentQty} - ${receivedQty}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(consumables.id, consumableId),
                  byTenantId(consumables.tenantId, lot.tenantId ?? actor.tenantId)
                )
              );

            await db.insert(stockMovements).values({
              tenantId: lot.tenantId,
              movementCode: generateOperationalCode("MOV"),
              consumableId,
              projectId: lot.projectId,
              purchaseLotId: lot.id,
              lotCode: lot.lotCode,
              qty: receivedQty,
              direction: "out",
              reason: "issue",
              unitCost: lot.unitCost,
              lineTotal,
              notes: `Direct project delivery to ${lot.projectName || "Project"} via PO ${poNumber}`,
              actorUserId: actor.userId,
              actorName: actor.displayName,
            });

            await db.insert(projectExpenseLines).values({
              tenantId: lot.tenantId,
              projectId: lot.projectId,
              lineType: "material",
              category: "miscellaneous",
              description: `${lot.itemName} (${receivedQty} × ₱${unit.toFixed(2)}) [PO: ${poNumber}]`,
              amount: lineTotal,
              quantity: String(receivedQty),
              unitCost: String(unit.toFixed(2)),
              consumableId,
              incurredOn: nowIso.slice(0, 10),
              notes: `Auto-credited upon PO ${poNumber} delivery. Supplier: ${
                isAggregateSupplierLabel(lot.supplierName) ? "—" : lot.supplierName || "—"
              }`,
              recordedByUserId: actor.userId,
              recordedByName: actor.displayName,
              metadata: {
                purchaseLotId: lot.id,
                poNumber,
                supplierName: isAggregateSupplierLabel(lot.supplierName)
                  ? null
                  : lot.supplierName,
                lotCode: lot.lotCode,
                directProjectDelivery: true,
              },
            });
          } else {
            // Standard warehouse intake → supplies or materials on-hand qty
            await db
              .update(consumables)
              .set({
                currentQty: sql`${consumables.currentQty} + ${receivedQty}`,
                lastRestocked: new Date(),
                updatedAt: new Date(),
                ...(lot.supplierName && !isAggregateSupplierLabel(lot.supplierName)
                  ? { supplier: lot.supplierName }
                  : {}),
              })
              .where(
                and(
                  eq(consumables.id, consumableId),
                  byTenantId(consumables.tenantId, lot.tenantId ?? actor.tenantId)
                )
              );

            await db.insert(stockMovements).values({
              tenantId: lot.tenantId,
              movementCode: generateOperationalCode("MOV"),
              consumableId,
              purchaseLotId: lot.id,
              lotCode: lot.lotCode,
              qty: receivedQty,
              direction: "in",
              reason: "restock",
              unitCost: lot.unitCost,
              lineTotal,
              notes:
                receivedQty === orderedQty
                  ? `Delivered via PO ${poNumber}`
                  : `Delivered via PO ${poNumber} — received ${receivedQty} of ${orderedQty} ordered`,
              actorUserId: actor.userId,
              actorName: actor.displayName,
            });
          }
        } else if (lot.itemType === "asset") {
          // Activate / mint physical units so /assets reflects received quantity
          const unitsToEnsure = receivedQty;
          let primaryAssetId = lot.assetId;
          const draftCategory = draft?.category || "Equipment";
          const draftLocation =
            draft?.location || "Property Custodian Depot";
          const draftAssignment =
            draft?.assignmentType || "borrowable";

          if (primaryAssetId) {
            const [existingAsset] = await db
              .select()
              .from(assets)
              .where(
                and(
                  eq(assets.id, primaryAssetId),
                  byTenantId(assets.tenantId, lot.tenantId ?? actor.tenantId)
                )
              )
              .for("update")
              .limit(1);

            if (!existingAsset) {
              throw new NotFoundError("Asset", primaryAssetId);
            }

            await db
              .update(assets)
              .set({
                status: "active",
                purchaseDate: existingAsset.purchaseDate || lot.purchasedOn,
                value: existingAsset.value || lot.unitCost,
                supplierId: existingAsset.supplierId || lot.supplierId,
                lastUpdated: new Date(),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(assets.id, primaryAssetId),
                  byTenantId(assets.tenantId, lot.tenantId ?? actor.tenantId)
                )
              );

            // Mint remaining units when PO ordered/received more than one physical asset
            for (let i = 1; i < unitsToEnsure; i++) {
              const assetCode = await this.nextCategoryAssetCode(
                existingAsset.category || draftCategory,
                session,
                lot.tenantId
              );
              await db.insert(assets).values({
                tenantId: lot.tenantId,
                assetCode,
                name: existingAsset.name,
                category: existingAsset.category,
                status: "active",
                assignmentType: existingAsset.assignmentType,
                modelId: existingAsset.modelId,
                location: existingAsset.location,
                purchaseDate: lot.purchasedOn,
                value: lot.unitCost,
                supplierId: lot.supplierId,
                notes: `Acquired via PO ${poNumber} (unit ${i + 1}/${unitsToEnsure})`,
              });
            }
          } else {
            // No linked asset yet — register received physical units from draft specs
            const [nameClash] = await db
              .select()
              .from(assets)
              .where(
                and(
                  sql`lower(${assets.name}) = ${lot.itemName.toLowerCase()}`,
                  lot.tenantId
                    ? eq(assets.tenantId, lot.tenantId)
                    : undefined
                )
              )
              .limit(1);
            if (nameClash) {
              throw new ConflictError(
                `Asset "${lot.itemName}" already exists as ${nameClash.assetCode}. Select it from the catalog instead of creating a new item.`
              );
            }

            for (let i = 0; i < unitsToEnsure; i++) {
              const assetCode = await this.nextCategoryAssetCode(
                draftCategory,
                session,
                lot.tenantId
              );
              const [created] = await db
                .insert(assets)
                .values({
                  tenantId: lot.tenantId,
                  assetCode,
                  name: lot.itemName,
                  category: draftCategory,
                  status: "active",
                  assignmentType: draftAssignment,
                  location: draftLocation,
                  purchaseDate: lot.purchasedOn,
                  value: lot.unitCost,
                  supplierId: lot.supplierId,
                  notes: `Acquired via PO ${poNumber}${
                    unitsToEnsure > 1 ? ` (unit ${i + 1}/${unitsToEnsure})` : ""
                  }`,
                })
                .returning();

              if (i === 0) {
                primaryAssetId = created.id;
                nextAssetId = created.id;
                nextItemCode = created.assetCode;
              }
            }
          }

          // Asset lots track one primary unit link; remaining qty stays available for write-off math
          nextRemaining = unitsToEnsure;
        }
      }

      const nextReceiptUrl =
        body.receiptUrl !== undefined
          ? body.receiptUrl
          : (lot.receiptUrl || currentMeta.receiptUrl || null);

      const cancellationReason =
        nextStatus === "cancelled"
          ? (body.cancellationReason || body.notes || currentMeta.cancellationReason || "").trim() ||
            null
          : currentMeta.cancellationReason;

      const nextNotes = serializeNotesMetadata({
        notes:
          nextStatus === "cancelled"
            ? currentMeta.cleanNotes
            : body.notes || currentMeta.cleanNotes,
        status: nextStatus,
        purpose: currentMeta.purpose,
        receiptUrl: nextReceiptUrl,
        approvedByName,
        approvedAt,
        orderedAt,
        deliveredAt,
        orderedQuantity: orderedQtyForMeta,
        receivedQuantity: receivedQtyForMeta,
        cancellationReason,
        draftItem:
          nextStatus === "delivered" && currentMeta.status !== "delivered"
            ? null
            : currentMeta.draftItem,
      });

      const updated = await this.repo.update(
        lot.id,
        {
          notes: nextNotes,
          quantity: nextQuantity,
          quantityRemaining: nextRemaining,
          receiptUrl: nextReceiptUrl,
          ...(nextAssetId && nextAssetId !== lot.assetId
            ? { assetId: nextAssetId }
            : {}),
          ...(nextConsumableId && nextConsumableId !== lot.consumableId
            ? { consumableId: nextConsumableId }
            : {}),
          ...(nextItemCode && nextItemCode !== lot.itemCode
            ? { itemCode: nextItemCode }
            : {}),
          // Drop stale PO-level aggregate labels from older multi-dealer POs.
          ...(isAggregateSupplierLabel(lot.supplierName)
            ? { supplierName: null }
            : {}),
          ...(nextStatus === "delivered" &&
          currentMeta.status !== "delivered" &&
          nextQuantity !== lot.quantity
            ? {
                totalCost: formatMoney(
                  (Number(lot.unitCost) || 0) * nextQuantity
                ),
              }
            : {}),
        },
        session
      );

      // Record Audit Log for Status Change
      const actionKey =
        nextStatus === "approved"
          ? "purchase_order_approved"
          : nextStatus === "ordered"
          ? "purchase_order_ordered"
          : nextStatus === "delivered"
          ? "purchase_order_delivered"
          : nextStatus === "cancelled"
          ? "purchase_order_cancelled"
          : "purchase_order_updated";

      const poCode = derivePONumber(lot.lotCode, lot.reference);

      await this.auditLogs.log(
        {
          entityType: AUDIT_ENTITY.purchaseOrder,
          entityId: poCode,
          action: actionKey,
          actorName: actor.displayName,
          actorUserId: actor.userId,
          notes: `PO ${poCode} status transitioned from ${currentMeta.status} to ${nextStatus}.${
            nextStatus === "cancelled" && cancellationReason
              ? ` Reason: ${cancellationReason}`
              : body.notes
                ? ` Notes: ${body.notes}`
                : ""
          }${
            nextStatus === "delivered" && receivedQtyForMeta != null
              ? ` Received qty: ${receivedQtyForMeta}${
                  orderedQtyForMeta != null &&
                  orderedQtyForMeta !== receivedQtyForMeta
                    ? ` (ordered ${orderedQtyForMeta})`
                    : ""
                }.`
              : ""
          }`,
          metadata: {
            poNumber: poCode,
            lotCode: lot.lotCode,
            previousStatus: currentMeta.status,
            newStatus: nextStatus,
            approvedByName,
            orderedQuantity: orderedQtyForMeta,
            receivedQuantity: receivedQtyForMeta,
            cancellationReason:
              nextStatus === "cancelled" ? cancellationReason : undefined,
          },
        },
        session
      );

      return toPurchaseLotDTO(updated ?? lot);
    });
  }

  /**
   * Update PO Details (supplier, reference, notes, purpose).
   */
  async updatePurchaseOrder(
    id: string,
    rawBody: unknown,
    actor: ActorContext
  ): Promise<PurchaseLotDTO> {
    const body: UpdatePurchaseOrderInput = updatePurchaseOrderSchema.parse(
      rawBody
    );

    return withTransaction(async (session) => {
      const db = session ?? getDb();
      const lot = await this.repo.findByIdForUpdate(id, session, actor.tenantId);
      if (!lot) {
        throw new NotFoundError("Purchase Order lot", id);
      }

      const currentMeta = parseNotesMetadata(lot.notes);
      let supplierName = lot.supplierName;
      const supplierId =
        body.supplierId !== undefined ? body.supplierId : lot.supplierId;

      if (supplierId && supplierId !== lot.supplierId) {
        const sup = await this.suppliers.findById(
          supplierId,
          session,
          actor.tenantId
        );
        if (sup) supplierName = sup.name;
      } else if (body.supplierName !== undefined) {
        supplierName = body.supplierName;
      }

      if (
        body.receiptUrl &&
        (currentMeta.status === "pending_approval" || currentMeta.status === "cancelled")
      ) {
        throw new BadRequestError(
          `Receipt upload is disabled while purchase order status is ${currentMeta.status.replace(
            "_",
            " "
          )}. Receipts can only be attached once the purchase order is approved.`
        );
      }

      const nextReceiptUrl =
        body.receiptUrl !== undefined
          ? body.receiptUrl
          : (lot.receiptUrl || currentMeta.receiptUrl || null);

      const updatedNotes = serializeNotesMetadata({
        notes: body.notes !== undefined ? body.notes : currentMeta.cleanNotes,
        status: currentMeta.status,
        purpose:
          body.purpose !== undefined ? body.purpose : currentMeta.purpose,
        receiptUrl: nextReceiptUrl,
        approvedByName: currentMeta.approvedByName,
        approvedAt: currentMeta.approvedAt,
        orderedAt: currentMeta.orderedAt,
        deliveredAt: currentMeta.deliveredAt,
        orderedQuantity: currentMeta.orderedQuantity,
        receivedQuantity: currentMeta.receivedQuantity,
        cancellationReason: currentMeta.cancellationReason,
        draftItem: currentMeta.draftItem,
      });

      const resolvedReference =
        body.poNumber !== undefined
          ? body.poNumber
          : body.reference !== undefined
          ? body.reference
          : lot.reference;

      if (
        resolvedReference &&
        resolvedReference.trim() &&
        resolvedReference.trim() !== (lot.reference || "").trim()
      ) {
        const clash = await this.repo.findByLotCode(
          resolvedReference.trim(),
          session,
          actor.tenantId
        );
        if (
          clash &&
          clash.id !== lot.id &&
          (clash.reference || "").trim() !== (lot.reference || "").trim()
        ) {
          throw new ConflictError(
            `PO number "${resolvedReference.trim()}" already exists. Choose a different number.`
          );
        }
      }

      const editableStatuses = new Set([
        "pending_approval",
        "approved",
        "ordered",
      ]);
      const wantsLineEdit =
        body.itemName !== undefined ||
        body.quantity !== undefined ||
        body.unitCost !== undefined;
      if (wantsLineEdit && !editableStatuses.has(currentMeta.status)) {
        throw new BadRequestError(
          `Line items can only be edited while the purchase order is pending, approved, or ordered (current: ${currentMeta.status.replace(/_/g, " ")}).`
        );
      }

      const nextQuantity =
        body.quantity !== undefined ? body.quantity : lot.quantity;
      const nextUnitCost =
        body.unitCost !== undefined
          ? formatMoney(body.unitCost)
          : lot.unitCost;
      const nextTotalCost = formatMoney(
        Number(nextUnitCost) * nextQuantity
      );

      const updated = await this.repo.update(
        lot.id,
        {
          supplierId,
          supplierName,
          reference: resolvedReference,
          purchasedOn: body.purchasedOn || lot.purchasedOn,
          notes: updatedNotes,
          receiptUrl: nextReceiptUrl,
          recordedByName: body.recordedByName !== undefined ? (body.recordedByName ?? "") : lot.recordedByName,
          ...(body.itemName !== undefined ? { itemName: body.itemName } : {}),
          ...(body.quantity !== undefined
            ? {
                quantity: nextQuantity,
                // Non-delivered lines keep remaining at 0 until intake.
                quantityRemaining:
                  currentMeta.status === "delivered"
                    ? lot.quantityRemaining
                    : 0,
              }
            : {}),
          ...(body.unitCost !== undefined || body.quantity !== undefined
            ? { unitCost: nextUnitCost, totalCost: nextTotalCost }
            : {}),
        },
        session
      );

      // Multi-purpose: batch-update purpose on sibling lots by id
      if (body.linePurposes && body.linePurposes.length > 0) {
        const poNumber = derivePONumber(
          lot.lotCode,
          resolvedReference ?? lot.reference
        );
        const siblings = await this.repo.listByPoNumber(
          poNumber,
          session,
          actor.tenantId
        );
        const siblingById = new Map(
          (siblings.length > 0 ? siblings : [lot]).map((s) => [s.id, s])
        );

        for (const entry of body.linePurposes) {
          const target = siblingById.get(entry.lotId);
          if (!target) {
            throw new BadRequestError(
              `Lot ${entry.lotId} is not part of purchase order ${poNumber}.`
            );
          }
          const targetMeta = parseNotesMetadata(target.notes);
          const nextPurposeNotes = serializeNotesMetadata({
            notes: targetMeta.cleanNotes,
            status: targetMeta.status,
            purpose: entry.purpose,
            receiptUrl: target.receiptUrl || targetMeta.receiptUrl,
            approvedByName: targetMeta.approvedByName,
            approvedAt: targetMeta.approvedAt,
            orderedAt: targetMeta.orderedAt,
            deliveredAt: targetMeta.deliveredAt,
            orderedQuantity: targetMeta.orderedQuantity,
            receivedQuantity: targetMeta.receivedQuantity,
            cancellationReason: targetMeta.cancellationReason,
            draftItem: targetMeta.draftItem,
          });
          await this.repo.update(
            target.id,
            { notes: nextPurposeNotes },
            session
          );
        }
      }

      // Re-read primary lot when purposes were batch-updated
      const refreshed =
        body.linePurposes && body.linePurposes.length > 0
          ? await this.repo.findById(lot.id, session, actor.tenantId)
          : updated;

      // If this PO has a reference (shared across multi-item lots), sync shared fields to siblings
      if (lot.reference) {
        const syncUpdates: Partial<PurchaseLotRow> = {};
        let needsSync = false;
        
        if (body.receiptUrl !== undefined) {
          syncUpdates.receiptUrl = nextReceiptUrl;
          needsSync = true;
        }
        if (body.recordedByName !== undefined) {
          syncUpdates.recordedByName = body.recordedByName ?? "";
          needsSync = true;
        }
        if (
          resolvedReference &&
          resolvedReference !== lot.reference &&
          (body.poNumber !== undefined || body.reference !== undefined)
        ) {
          syncUpdates.reference = resolvedReference;
          needsSync = true;
        }

        if (needsSync) {
          await db
            .update(purchaseLots)
            .set({ ...syncUpdates, updatedAt: new Date() })
            .where(eq(purchaseLots.reference, lot.reference));
        }
      }

      const oldRef = (lot.reference || "").trim();
      const newRef = (resolvedReference || "").trim();
      if (
        oldRef &&
        newRef &&
        oldRef !== newRef &&
        (body.poNumber !== undefined || body.reference !== undefined)
      ) {
        await renamePoDepartmentLinks(
          oldRef,
          newRef,
          actor.tenantId,
          session
        );
      }

      const poCode = derivePONumber(
        lot.lotCode,
        resolvedReference ?? lot.reference
      );
      const updates = [];
      if (body.recordedByName !== undefined && body.recordedByName !== lot.recordedByName) {
        updates.push(`Requester changed from '${lot.recordedByName || "None"}' to '${body.recordedByName}'`);
      }
      if (body.receiptUrl !== undefined && body.receiptUrl !== (lot.receiptUrl || currentMeta.receiptUrl)) {
        updates.push("Receipt attached/updated");
      }
      if (body.supplierId !== undefined && body.supplierId !== lot.supplierId) {
        updates.push("Supplier changed");
      }
      if (body.linePurposes && body.linePurposes.length > 0) {
        updates.push(
          `Purpose updated on ${body.linePurposes.length} line(s)`
        );
      } else if (body.purpose !== undefined) {
        updates.push("Purpose updated");
      }

      const updateText = updates.length > 0 
        ? `Updated details for Purchase Order ${poCode}: ${updates.join("; ")}.` 
        : `Updated details for Purchase Order ${poCode}.`;

      await this.auditLogs.log(
        {
          entityType: AUDIT_ENTITY.purchaseOrder,
          entityId: poCode,
          action: "purchase_order_updated",
          actorName: actor.displayName,
          actorUserId: actor.userId,
          notes: updateText,
          metadata: {
            poNumber: poCode,
            lotCode: lot.lotCode,
            updatedRequester: body.recordedByName !== undefined ? body.recordedByName : undefined,
          },
        },
        session
      );

      return (
        await withPoDepartments(
          [toPurchaseLotDTO(refreshed ?? updated ?? lot)],
          actor.tenantId,
          session
        )
      )[0];
    });
  }

  /**
   * Append line items to an existing PO that is still pending approval.
   * Reuses the same deferred-catalog rules as create (no stock intake).
   */
  async addPurchaseOrderLines(
    id: string,
    rawBody: unknown,
    actor: ActorContext
  ): Promise<PurchaseLotDTO[]> {
    const body: AddPurchaseOrderLinesInput = addPurchaseOrderLinesSchema.parse(
      rawBody
    );

    return withTransaction(async (session) => {
      const db = session ?? getDb();
      const anchor = await this.repo.findByIdForUpdate(id, session, actor.tenantId);
      if (!anchor) {
        throw new NotFoundError("Purchase Order lot", id);
      }

      const anchorMeta = parseNotesMetadata(anchor.notes);
      if (anchorMeta.status !== "pending_approval") {
        throw new BadRequestError(
          "Line items can only be added while the purchase order is still pending approval."
        );
      }

      const poNumber = derivePONumber(anchor.lotCode, anchor.reference);
      const siblings = await this.repo.listByPoNumber(
        poNumber,
        session,
        actor.tenantId
      );
      const siblingRows = siblings.length > 0 ? siblings : [anchor];

      for (const sibling of siblingRows) {
        const siblingMeta = parseNotesMetadata(sibling.notes);
        if (siblingMeta.status !== "pending_approval") {
          throw new BadRequestError(
            "This purchase order already has approved or later lines. File a new PO instead of adding items here."
          );
        }
      }

      const claim = await findActivePoDisbursement(poNumber, actor.tenantId);
      if (claim) {
        throw new ConflictError(
          `Purchase Order "${poNumber}" is already linked to ${
            claim.kind === "voucher" ? "disbursement voucher" : "petty cash voucher"
          } ${claim.code}. Unlink or cancel that claim before adding items.`
        );
      }

      const isProjectPo = Boolean(anchor.projectId);
      if (isProjectPo) {
        for (const [index, item] of body.items.entries()) {
          if (item.itemType !== "consumable") {
            throw new BadRequestError(
              `Direct project procurement supports consumable materials only (item ${index + 1}).`
            );
          }
        }
      }

      const results: PurchaseLotDTO[] = [];

      for (const item of body.items) {
        let consumableId: string | null = item.consumableId ?? null;
        let assetId: string | null = item.assetId ?? null;
        let itemCode = "";
        let itemName = item.name.trim();
        let draftItem: DraftItemSpecs | null = null;

        const targetProjectId = item.projectId || anchor.projectId || null;
        const targetProjectName = item.projectName || anchor.projectName || null;

        let lineSupplierId = item.supplierId ?? null;
        let lineSupplierName = item.suggestedDealer?.trim() || null;
        if (lineSupplierId) {
          const lineSup = await this.suppliers.findById(
            lineSupplierId,
            session,
            actor.tenantId
          );
          if (lineSup) lineSupplierName = lineSup.name;
        }
        if (!lineSupplierName && anchor.supplierName) {
          lineSupplierName = isAggregateSupplierLabel(anchor.supplierName)
            ? null
            : anchor.supplierName;
        }
        if (!lineSupplierId && anchor.supplierId && lineSupplierName) {
          lineSupplierId = anchor.supplierId;
        }
        if (isAggregateSupplierLabel(lineSupplierName)) {
          lineSupplierName = item.suggestedDealer?.trim() || null;
        }

        if (item.itemType === "consumable") {
          if (consumableId) {
            const [existing] = await db
              .select()
              .from(consumables)
              .where(
                and(
                  eq(consumables.id, consumableId),
                  byTenantId(consumables.tenantId, actor.tenantId)
                )
              )
              .limit(1);
            if (!existing) {
              throw new NotFoundError("Consumable", consumableId);
            }
            itemCode = existing.itemCode;
            itemName = existing.name;

            if (targetProjectId && existing.classification !== "material") {
              await db
                .update(consumables)
                .set({ classification: "material", updatedAt: new Date() })
                .where(
                  and(
                    eq(consumables.id, consumableId),
                    byTenantId(consumables.tenantId, actor.tenantId)
                  )
                );
            }
          } else {
            itemCode = generateOperationalCode("ITM");
            consumableId = null;
            draftItem = {
              category: item.category || "General Supply",
              classification:
                item.classification || (targetProjectId ? "material" : "supply"),
              unit: item.unit || "pcs",
              minThreshold: item.minThreshold ?? 5,
              location: item.location || "Main Property Storage",
            };
          }
        }

        if (item.itemType === "asset") {
          if (assetId) {
            const [existing] = await db
              .select()
              .from(assets)
              .where(
                and(
                  eq(assets.id, assetId),
                  byTenantId(assets.tenantId, actor.tenantId)
                )
              )
              .limit(1);
            if (!existing) {
              throw new NotFoundError("Asset", assetId);
            }
            itemCode = existing.assetCode;
            itemName = existing.name;
          } else {
            itemCode = generateOperationalCode("ITM");
            assetId = null;
            draftItem = {
              category: item.category || "Equipment",
              location: item.location || "Property Custodian Depot",
              assignmentType: item.assignmentType || "borrowable",
            };
          }
        }

        const unitCost = formatMoney(item.unitCost);
        const totalCost = formatMoney(Number(unitCost) * item.quantity);
        const lotCode = generateOperationalCode("PO");

        const lotPurposeRaw = (item.purpose || "").trim();
        const lotPurpose =
          anchor.departmentName && lotPurposeRaw && !lotPurposeRaw.startsWith("[")
            ? `[${anchor.departmentName}] ${lotPurposeRaw}`.trim()
            : lotPurposeRaw || null;
        if (!lotPurpose || !hasPoJustification(lotPurpose)) {
          throw new BadRequestError("Procurement purpose is required for every line item.");
        }

        const serializedNotes = serializeNotesMetadata({
          notes: anchorMeta.cleanNotes,
          status: "pending_approval",
          purpose: lotPurpose,
          receiptUrl: anchor.receiptUrl || anchorMeta.receiptUrl,
          approvedByName: null,
          approvedAt: null,
          orderedAt: null,
          deliveredAt: null,
          draftItem,
        });

        const row = await this.repo.create(
          {
            tenantId: actor.tenantId,
            lotCode,
            itemType: item.itemType,
            consumableId,
            assetId,
            itemCode,
            itemName,
            supplierId: lineSupplierId,
            supplierName: lineSupplierName,
            departmentId: anchor.departmentId,
            departmentName: anchor.departmentName,
            projectId: targetProjectId,
            projectName: targetProjectName,
            quantity: item.quantity,
            quantityRemaining: 0,
            unitCost,
            totalCost,
            purchasedOn: anchor.purchasedOn,
            reference: poNumber,
            notes: serializedNotes,
            receiptUrl: anchor.receiptUrl || null,
            recordedByUserId: anchor.recordedByUserId,
            recordedByName: anchor.recordedByName,
          },
          session
        );

        results.push(toPurchaseLotDTO(row));
      }

      await this.auditLogs.log(
        {
          entityType: AUDIT_ENTITY.purchaseOrder,
          entityId: poNumber,
          action: "purchase_order_updated",
          actorName: actor.displayName,
          actorUserId: actor.userId,
          notes: `Added ${results.length} line item(s) to Purchase Order ${poNumber} while pending approval.`,
          metadata: {
            poNumber,
            addedItemCount: results.length,
            addedItemNames: results.map((r) => r.itemName),
          },
        },
        session
      );

      return withPoDepartments(results, actor.tenantId, session);
    });
  }

  /**
   * Delete or Cancel PO line (legacy single-lot). Prefer {@link previewDeleteByPoNumber}
   * + {@link deleteByPoNumberWithRevert} for whole-PO cleanup with inventory revert.
   */
  async deletePurchaseOrder(id: string, actor: ActorContext): Promise<boolean> {
    return withTransaction(async (session) => {
      const lot = await this.repo.findByIdForUpdate(id, session, actor.tenantId);
      if (!lot) {
        throw new NotFoundError("Purchase Order lot", id);
      }

      const poCode = derivePONumber(lot.lotCode, lot.reference);
      const meta = parseNotesMetadata(lot.notes);

      // If delivered and already drawn down, prevent hard delete
      if (meta.status === "delivered" && lot.quantityRemaining < lot.quantity) {
        throw new BadRequestError(
          "Cannot delete a delivered PO that has already been drawn or issued. Cancel the order instead."
        );
      }

      const ok = await this.repo.delete(id, session);

      // If this was the last line for the PO number, drop multi-dept join rows.
      const poRef = (lot.reference || "").trim();
      if (ok && poRef) {
        const siblings = await this.repo.listByPoNumber(
          poRef,
          session,
          actor.tenantId
        );
        if (siblings.length === 0) {
          await deletePoDepartmentLinks(poRef, actor.tenantId, session);
        }
      }

      await this.auditLogs.log(
        {
          entityType: AUDIT_ENTITY.purchaseOrder,
          entityId: poCode,
          action: "purchase_order_cancelled",
          actorName: actor.displayName,
          actorUserId: actor.userId,
          notes: `Deleted / Removed Purchase Order line ${poCode} (${lot.itemName}).`,
          metadata: {
            poNumber: poCode,
            lotCode: lot.lotCode,
            itemName: lot.itemName,
          },
        },
        session
      );

      return ok;
    });
  }

  /** TEMPORARY: preview inventory/asset effects of deleting an entire PO. */
  async previewDeleteByPoNumber(
    poNumber: string,
    tenantId?: string
  ): Promise<PoDeleteImpact> {
    return computePoDeleteImpact(poNumber, tenantId, this.repo);
  }

  /** TEMPORARY: atomic delete of all PO lines with inventory revert when clear. */
  async deleteByPoNumberWithRevert(
    poNumber: string,
    actor: ActorContext
  ): Promise<PoDeleteImpact> {
    return deletePurchaseOrderWithRevert(
      poNumber,
      actor,
      this.repo,
      this.auditLogs
    );
  }

  /** Exposed for project FIFO / repo-level callers. */
  listAvailableForConsumableFifo(
    consumableId: string,
    session: DbSession,
    tenantId?: string
  ) {
    return this.repo.listAvailableForConsumableFifo(
      consumableId,
      session,
      tenantId ?? getTenantContext()?.tenantId
    );
  }

  updateRemaining(
    id: string,
    quantityRemaining: number,
    session?: DbSession,
    tenantId?: string
  ) {
    return this.repo.updateRemaining(
      id,
      quantityRemaining,
      session,
      tenantId ?? getTenantContext()?.tenantId
    );
  }

  /**
   * Draw quantity from a single lot (QR scan path for multi-supplier pricing).
   */
  async consumeFromLot(
    lotCode: string,
    quantity: number,
    session: DbSession,
    expectedConsumableId?: string,
    tenantId?: string
  ): Promise<{ lot: PurchaseLotDTO; allocation: LotCostAllocation }> {
    if (quantity <= 0) {
      throw new BadRequestError("quantity must be positive.");
    }

    const scope = tenantId ?? getTenantContext()?.tenantId;
    const lot = await this.repo.findByLotCodeForUpdate(lotCode, session, scope);
    if (!lot) {
      throw new NotFoundError("Purchase lot", lotCode);
    }

    return this.drawFromLockedLot(lot, quantity, session, expectedConsumableId, scope);
  }

  /** Same as consumeFromLot but keyed by lot id. */
  async consumeFromLotId(
    lotId: string,
    quantity: number,
    session: DbSession,
    expectedConsumableId?: string,
    tenantId?: string
  ): Promise<{ lot: PurchaseLotDTO; allocation: LotCostAllocation }> {
    if (quantity <= 0) {
      throw new BadRequestError("quantity must be positive.");
    }

    const scope = tenantId ?? getTenantContext()?.tenantId;
    const lot = await this.repo.findByIdForUpdate(lotId, session, scope);
    if (!lot) {
      throw new NotFoundError("Purchase lot", lotId);
    }

    return this.drawFromLockedLot(lot, quantity, session, expectedConsumableId, scope);
  }

  private async drawFromLockedLot(
    lot: PurchaseLotRow,
    quantity: number,
    session: DbSession,
    expectedConsumableId?: string,
    tenantId?: string
  ): Promise<{ lot: PurchaseLotDTO; allocation: LotCostAllocation }> {
    if (lot.itemType !== "consumable") {
      throw new BadRequestError(
        "Only consumable purchase lots support quantity release via scan."
      );
    }

    if (
      expectedConsumableId &&
      lot.consumableId &&
      lot.consumableId !== expectedConsumableId
    ) {
      throw new BadRequestError(
        `Lot ${lot.lotCode} does not belong to this consumable item.`
      );
    }

    if (lot.quantityRemaining < quantity) {
      throw new BadRequestError(
        `Insufficient remaining in lot ${lot.lotCode}. Available: ${lot.quantityRemaining}.`
      );
    }

    await this.repo.updateRemaining(
      lot.id,
      lot.quantityRemaining - quantity,
      session,
      tenantId
    );

    const unit = Number(lot.unitCost);
    const total = unit * quantity;
    const allocation: LotCostAllocation = {
      lotId: lot.id,
      lotCode: lot.lotCode,
      quantity,
      unitCost: formatMoney(unit),
      total: formatMoney(total),
      supplierId: lot.supplierId,
      supplierName: lot.supplierName,
    };

    const refreshed = await this.repo.findById(lot.id, session, tenantId);
    return {
      lot: toPurchaseLotDTO(refreshed ?? lot),
      allocation,
    };
  }

  /**
   * Attach found / correction stock onto an existing lot (increase remaining).
   */
  async addToLot(
    opts: { lotId?: string; lotCode?: string },
    quantity: number,
    session: DbSession,
    expectedConsumableId?: string,
    tenantId?: string
  ): Promise<{ lot: PurchaseLotDTO; allocation: LotCostAllocation }> {
    if (quantity <= 0) {
      throw new BadRequestError("quantity must be positive.");
    }

    const scope = tenantId ?? getTenantContext()?.tenantId;
    let lot: PurchaseLotRow | null = null;
    if (opts.lotId) {
      lot = await this.repo.findByIdForUpdate(opts.lotId, session, scope);
    } else if (opts.lotCode) {
      lot = await this.repo.findByLotCodeForUpdate(opts.lotCode, session, scope);
    } else {
      throw new BadRequestError("lotId or lotCode is required.");
    }

    if (!lot) {
      throw new NotFoundError(
        "Purchase lot",
        opts.lotId ?? opts.lotCode ?? ""
      );
    }

    if (lot.itemType !== "consumable") {
      throw new BadRequestError(
        "Only consumable purchase lots support quantity adjustments."
      );
    }

    if (
      expectedConsumableId &&
      lot.consumableId &&
      lot.consumableId !== expectedConsumableId
    ) {
      throw new BadRequestError(
        `Lot ${lot.lotCode} does not belong to this consumable item.`
      );
    }

    const nextQty = lot.quantity + quantity;
    const nextRemaining = lot.quantityRemaining + quantity;
    await this.repo.updateQuantities(lot.id, nextQty, nextRemaining, session, scope);

    const unit = Number(lot.unitCost);
    const allocation: LotCostAllocation = {
      lotId: lot.id,
      lotCode: lot.lotCode,
      quantity,
      unitCost: formatMoney(unit),
      total: formatMoney(unit * quantity),
      supplierId: lot.supplierId,
      supplierName: lot.supplierName,
    };

    const refreshed = await this.repo.findById(lot.id, session, scope);
    return {
      lot: toPurchaseLotDTO(refreshed ?? lot),
      allocation,
    };
  }

  /**
   * FIFO draw across available lots for a consumable (generic checkout).
   */
  async consumeFifo(
    consumableId: string,
    quantity: number,
    session: DbSession,
    tenantId?: string
  ): Promise<LotCostAllocation[]> {
    if (quantity <= 0) {
      throw new BadRequestError("quantity must be positive.");
    }

    let remaining = quantity;
    const allocations: LotCostAllocation[] = [];
    const scope = tenantId ?? getTenantContext()?.tenantId;
    const available = await this.repo.listAvailableForConsumableFifo(
      consumableId,
      session,
      scope
    );

    for (const lot of available) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, lot.quantityRemaining);
      if (take <= 0) continue;

      const unit = Number(lot.unitCost);
      const lineTotal = unit * take;
      allocations.push({
        lotId: lot.id,
        lotCode: lot.lotCode,
        quantity: take,
        unitCost: formatMoney(unit),
        total: formatMoney(lineTotal),
        supplierId: lot.supplierId,
        supplierName: lot.supplierName,
      });

      await this.repo.updateRemaining(
        lot.id,
        lot.quantityRemaining - take,
        session,
        scope
      );
      remaining -= take;
    }

    if (remaining > 0) {
      allocations.push({
        lotId: null,
        lotCode: null,
        quantity: remaining,
        unitCost: "0.00",
        total: "0.00",
        uncosted: true,
      });
    }

    return allocations;
  }

  /**
   * Resolves optional supplierId → name snapshot, then inserts the lot.
   */
  async recordLot(
    input: CreatePurchaseLotInput,
    session?: DbSession
  ): Promise<PurchaseLotDTO> {
    let supplierName = input.supplierName ?? null;
    const supplierId = input.supplierId ?? null;

    if (supplierId) {
      const supplier = await this.suppliers.findById(
        supplierId,
        session,
        input.tenantId ?? undefined
      );
      if (!supplier) {
        throw new NotFoundError("Supplier", supplierId);
      }
      if (supplier.status !== "active") {
        throw new BadRequestError(
          "Selected supplier is inactive. Choose an active vendor."
        );
      }
      supplierName = supplier.name;
    }

    const unitCost = formatMoney(input.unitCost);
    const total = formatMoney(Number(unitCost) * input.quantity);
    const status = input.status || "delivered";

    const serializedNotes = serializeNotesMetadata({
      notes: input.notes,
      status,
      purpose: input.purpose,
      approvedByName: input.recordedByName,
      approvedAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
    });

    const row = await this.repo.create(
      {
        tenantId: input.tenantId ?? undefined,
        lotCode: generateOperationalCode("LOT"),
        itemType: input.itemType,
        consumableId: input.consumableId ?? null,
        assetId: input.assetId ?? null,
        itemCode: input.itemCode,
        itemName: input.itemName,
        supplierId,
        supplierName,
        quantity: input.quantity,
        quantityRemaining: status === "delivered" ? input.quantity : 0,
        unitCost,
        totalCost: total,
        purchasedOn: input.purchasedOn,
        reference: input.reference ?? null,
        notes: serializedNotes,
        recordedByUserId: input.recordedByUserId,
        recordedByName: input.recordedByName,
      },
      session
    );

    return toPurchaseLotDTO(row);
  }
}
