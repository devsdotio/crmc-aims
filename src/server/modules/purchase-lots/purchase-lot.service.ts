import { eq, sql } from "drizzle-orm";
import type { PurchaseLotRow } from "@/server/db/schema";
import {
  assets,
  consumables,
  projectExpenseLines,
  purchaseLots,
  stockMovements,
} from "@/server/db/schema";
import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { withTransaction } from "@/server/db/transaction";
import { generateOperationalCode } from "@/server/shared/codes";
import {
  BadRequestError,
  NotFoundError,
} from "@/server/shared/errors";
import { encodeLotQr, parseScanPayload } from "@/server/shared/qr";
import type { ActorContext } from "@/server/shared/auth";
import { SupplierRepository } from "@/server/modules/suppliers/supplier.repository";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";

import { PurchaseLotRepository } from "./purchase-lot.repository";
import { listActivePoDisbursements } from "./po-disbursement";
import {
  computePoDeleteImpact,
  deletePurchaseOrderWithRevert,
} from "./purchase-lot-delete-impact";
import type {
  CreatePurchaseLotInput,
  CreatePurchaseOrderInput,
  PoDeleteImpact,
  PurchaseLotDTO,
  PurchaseOrderStatus,
  UpdatePurchaseOrderInput,
  UpdatePurchaseOrderStatusInput,
} from "./purchase-lot.types";
import {
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
    if (lower !== "initial stock" && lower !== "opening balance") {
      return trimmed;
    }
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
}): string {
  return JSON.stringify({
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
  });
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

export class PurchaseLotService {
  private readonly auditLogs = new AuditLogService();

  constructor(
    private readonly repo = new PurchaseLotRepository(),
    private readonly suppliers = new SupplierRepository()
  ) {}

  async list(rawQuery: unknown, actorTenantId?: string): Promise<PurchaseLotDTO[]> {
    const filters = listPurchaseLotsQuerySchema.parse(rawQuery ?? {});
    const rows = await this.repo.list(filters, undefined, actorTenantId);
    let dtos = rows.map(toPurchaseLotDTO);

    if (filters.status) {
      dtos = dtos.filter((d) => d.status === filters.status);
    }
    return withDisbursementClaims(dtos, actorTenantId);
  }

  async getById(rawId: string, actorTenantId?: string): Promise<PurchaseLotDTO> {
    const id = purchaseLotIdSchema.parse(rawId);
    const row = await this.repo.findById(id, undefined, actorTenantId);
    if (!row) throw new NotFoundError("Purchase lot / PO", id);
    const [dto] = await withDisbursementClaims(
      [toPurchaseLotDTO(row)],
      actorTenantId
    );
    return dto;
  }

  async getByCode(rawCode: string, actorTenantId?: string): Promise<PurchaseLotDTO> {
    const parsed = parseScanPayload(rawCode);
    if (!parsed.code) {
      throw new BadRequestError("Lot / PO code is required.");
    }
    const row = await this.repo.findByLotCode(parsed.code, undefined, actorTenantId);
    if (!row) throw new NotFoundError("Purchase lot / PO", parsed.code);
    const [dto] = await withDisbursementClaims(
      [toPurchaseLotDTO(row)],
      actorTenantId
    );
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

    return withTransaction(async (session) => {
      const results: PurchaseLotDTO[] = [];
      const db = session ?? getDb();

      let resolvedSupplierName = body.supplierName?.trim() || null;
      const supplierId = body.supplierId ?? null;

      if (supplierId) {
        const sup = await this.suppliers.findById(supplierId, session);
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

        const targetProjectId = item.projectId || body.projectId || null;
        const targetProjectName = item.projectName || body.projectName || null;

        // Prefer the line item's own dealer; fall back to PO-level only when it is a real vendor.
        let lineSupplierId = item.supplierId ?? null;
        let lineSupplierName = item.suggestedDealer?.trim() || null;
        if (lineSupplierId) {
          const lineSup = await this.suppliers.findById(lineSupplierId, session);
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
              .where(eq(consumables.id, consumableId))
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
                .where(eq(consumables.id, consumableId));
            }

            // If created directly in "delivered" state
            if (initialStatus === "delivered") {
              if (targetProjectId) {
                // Auto-issue movement for direct project material delivery (currentQty unchanged)
                await db.insert(stockMovements).values({
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
                  .where(eq(consumables.id, consumableId));

                // Record stock movement
                await db.insert(stockMovements).values({
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
          } else {
            // New consumable registration
            itemCode = generateOperationalCode("ITM");
            const itemClassification = item.classification || (targetProjectId ? "material" : "supply");
            const initialQty = initialStatus === "delivered" && !targetProjectId ? item.quantity : 0;

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
                lastRestocked: initialStatus === "delivered" && !targetProjectId ? new Date() : undefined,
                notes: body.notes,
              })
              .returning();
            consumableId = newConsumable.id;

            if (initialStatus === "delivered") {
              if (targetProjectId) {
                // Auto-issue movement for direct project material delivery
                await db.insert(stockMovements).values({
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
            }
          }
        }

        // 2. Handle Fixed Asset
        if (item.itemType === "asset") {
          if (assetId) {
            const [existing] = await db
              .select()
              .from(assets)
              .where(eq(assets.id, assetId))
              .limit(1);
            if (!existing) {
              throw new NotFoundError("Asset", assetId);
            }
            itemCode = existing.assetCode;
            itemName = existing.name;
          } else {
            // New asset(s): one placeholder until receive, or all units if filed as delivered.
            const unitsToCreate =
              initialStatus === "delivered" ? Math.max(1, item.quantity) : 1;
            let firstCode = "";
            let firstId: string | null = null;

            for (let i = 0; i < unitsToCreate; i++) {
              const code = generateOperationalCode("AST");
              const [newAsset] = await db
                .insert(assets)
                .values({
                  tenantId: actor.tenantId,
                  assetCode: code,
                  name: itemName,
                  category: item.category || "Equipment",
                  status: initialStatus === "delivered" ? "active" : "needs_repair",
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
          }
        }

        const unitCost = formatMoney(item.unitCost);
        const totalCost = formatMoney(Number(unitCost) * item.quantity);
        const lotCode = generateOperationalCode("PO");

        const lotPurposeRaw = (item.purpose || body.purpose || "").trim();
        const departmentName = body.departmentName?.trim() || null;
        const departmentId = body.departmentId ?? null;
        // Prefer body-level purpose with department prefix so [Dept] is preserved
        // even when line items also send a purpose string.
        const lotPurpose =
          departmentName && !lotPurposeRaw.startsWith("[")
            ? `[${departmentName}] ${lotPurposeRaw}`.trim()
            : body.purpose?.trim() || lotPurposeRaw || null;

        const serializedNotes = serializeNotesMetadata({
          notes: body.notes,
          status: initialStatus,
          purpose: lotPurpose,
          receiptUrl: body.receiptUrl,
          approvedByName,
          approvedAt,
          orderedAt,
          deliveredAt,
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

        results.push(toPurchaseLotDTO(row));
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
      const lot = await this.repo.findByIdForUpdate(id, session);
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

        if (lot.itemType === "consumable") {
          if (!lot.consumableId) {
            throw new BadRequestError(
              `Cannot receive PO line "${lot.itemName}" — no linked supply/material catalog item.`
            );
          }

          const [consumable] = await db
            .select()
            .from(consumables)
            .where(eq(consumables.id, lot.consumableId))
            .for("update")
            .limit(1);

          if (!consumable) {
            throw new NotFoundError("Consumable", lot.consumableId);
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
                .where(eq(consumables.id, lot.consumableId));
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
              .where(eq(consumables.id, lot.consumableId));

            await db.insert(stockMovements).values({
              tenantId: lot.tenantId,
              movementCode: generateOperationalCode("MOV"),
              consumableId: lot.consumableId,
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
              .where(eq(consumables.id, lot.consumableId));

            await db.insert(stockMovements).values({
              tenantId: lot.tenantId,
              movementCode: generateOperationalCode("MOV"),
              consumableId: lot.consumableId,
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
              consumableId: lot.consumableId,
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
              .where(eq(consumables.id, lot.consumableId));

            await db.insert(stockMovements).values({
              tenantId: lot.tenantId,
              movementCode: generateOperationalCode("MOV"),
              consumableId: lot.consumableId,
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

          if (primaryAssetId) {
            const [existingAsset] = await db
              .select()
              .from(assets)
              .where(eq(assets.id, primaryAssetId))
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
              .where(eq(assets.id, primaryAssetId));

            // Mint remaining units when PO ordered/received more than one physical asset
            for (let i = 1; i < unitsToEnsure; i++) {
              await db.insert(assets).values({
                tenantId: lot.tenantId,
                assetCode: generateOperationalCode("AST"),
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
            // No linked asset yet — register received physical units now
            for (let i = 0; i < unitsToEnsure; i++) {
              const [created] = await db
                .insert(assets)
                .values({
                  tenantId: lot.tenantId,
                  assetCode: generateOperationalCode("AST"),
                  name: lot.itemName,
                  category: "Equipment",
                  status: "active",
                  assignmentType: "borrowable",
                  location: "Property Custodian Depot",
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

      const nextNotes = serializeNotesMetadata({
        notes: body.notes || currentMeta.cleanNotes,
        status: nextStatus,
        purpose: currentMeta.purpose,
        receiptUrl: nextReceiptUrl,
        approvedByName,
        approvedAt,
        orderedAt,
        deliveredAt,
        orderedQuantity: orderedQtyForMeta,
        receivedQuantity: receivedQtyForMeta,
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
            body.notes ? ` Notes: ${body.notes}` : ""
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
      const lot = await this.repo.findByIdForUpdate(id, session);
      if (!lot) {
        throw new NotFoundError("Purchase Order lot", id);
      }

      const currentMeta = parseNotesMetadata(lot.notes);
      let supplierName = lot.supplierName;
      const supplierId =
        body.supplierId !== undefined ? body.supplierId : lot.supplierId;

      if (supplierId && supplierId !== lot.supplierId) {
        const sup = await this.suppliers.findById(supplierId, session);
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
      });

      const resolvedReference =
        body.poNumber !== undefined
          ? body.poNumber
          : body.reference !== undefined
          ? body.reference
          : lot.reference;

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
        },
        session
      );

      // If this PO has a reference (shared across multi-item lots), sync receiptUrl to siblings
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

        if (needsSync) {
          await db
            .update(purchaseLots)
            .set({ ...syncUpdates, updatedAt: new Date() })
            .where(eq(purchaseLots.reference, lot.reference));
        }
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

      return toPurchaseLotDTO(updated ?? lot);
    });
  }

  /**
   * Delete or Cancel PO line (legacy single-lot). Prefer {@link previewDeleteByPoNumber}
   * + {@link deleteByPoNumberWithRevert} for whole-PO cleanup with inventory revert.
   */
  async deletePurchaseOrder(id: string, actor: ActorContext): Promise<boolean> {
    return withTransaction(async (session) => {
      const lot = await this.repo.findByIdForUpdate(id, session);
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
    session: DbSession
  ) {
    return this.repo.listAvailableForConsumableFifo(consumableId, session);
  }

  updateRemaining(
    id: string,
    quantityRemaining: number,
    session?: DbSession
  ) {
    return this.repo.updateRemaining(id, quantityRemaining, session);
  }

  /**
   * Draw quantity from a single lot (QR scan path for multi-supplier pricing).
   */
  async consumeFromLot(
    lotCode: string,
    quantity: number,
    session: DbSession,
    expectedConsumableId?: string
  ): Promise<{ lot: PurchaseLotDTO; allocation: LotCostAllocation }> {
    if (quantity <= 0) {
      throw new BadRequestError("quantity must be positive.");
    }

    const lot = await this.repo.findByLotCodeForUpdate(lotCode, session);
    if (!lot) {
      throw new NotFoundError("Purchase lot", lotCode);
    }

    return this.drawFromLockedLot(lot, quantity, session, expectedConsumableId);
  }

  /** Same as consumeFromLot but keyed by lot id. */
  async consumeFromLotId(
    lotId: string,
    quantity: number,
    session: DbSession,
    expectedConsumableId?: string
  ): Promise<{ lot: PurchaseLotDTO; allocation: LotCostAllocation }> {
    if (quantity <= 0) {
      throw new BadRequestError("quantity must be positive.");
    }

    const lot = await this.repo.findByIdForUpdate(lotId, session);
    if (!lot) {
      throw new NotFoundError("Purchase lot", lotId);
    }

    return this.drawFromLockedLot(lot, quantity, session, expectedConsumableId);
  }

  private async drawFromLockedLot(
    lot: PurchaseLotRow,
    quantity: number,
    session: DbSession,
    expectedConsumableId?: string
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
      session
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

    const refreshed = await this.repo.findById(lot.id, session);
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
    expectedConsumableId?: string
  ): Promise<{ lot: PurchaseLotDTO; allocation: LotCostAllocation }> {
    if (quantity <= 0) {
      throw new BadRequestError("quantity must be positive.");
    }

    let lot: PurchaseLotRow | null = null;
    if (opts.lotId) {
      lot = await this.repo.findByIdForUpdate(opts.lotId, session);
    } else if (opts.lotCode) {
      lot = await this.repo.findByLotCodeForUpdate(opts.lotCode, session);
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
    await this.repo.updateQuantities(lot.id, nextQty, nextRemaining, session);

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

    const refreshed = await this.repo.findById(lot.id, session);
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
    session: DbSession
  ): Promise<LotCostAllocation[]> {
    if (quantity <= 0) {
      throw new BadRequestError("quantity must be positive.");
    }

    let remaining = quantity;
    const allocations: LotCostAllocation[] = [];
    const available = await this.repo.listAvailableForConsumableFifo(
      consumableId,
      session
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
        session
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
      const supplier = await this.suppliers.findById(supplierId, session);
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
        lotCode: generateOperationalCode("PO"),
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
