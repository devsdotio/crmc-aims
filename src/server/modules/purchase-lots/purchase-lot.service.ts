import { eq } from "drizzle-orm";
import type { PurchaseLotRow } from "@/server/db/schema";
import {
  assets,
  consumables,
  purchaseLots,
  stockMovements,
} from "@/server/db/schema";
import { auditLogs } from "@/server/db/schema/audit-logs";
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

import { PurchaseLotRepository } from "./purchase-lot.repository";
import type {
  CreatePurchaseLotInput,
  CreatePurchaseOrderInput,
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
    return reference.trim();
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
  let status: PurchaseOrderStatus = "delivered";
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
    if (rawNotes.startsWith("{") && rawNotes.includes('"status"')) {
      try {
        const meta = JSON.parse(rawNotes);
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
  };
}

export class PurchaseLotService {
  constructor(
    private readonly repo = new PurchaseLotRepository(),
    private readonly suppliers = new SupplierRepository()
  ) {}

  async list(rawQuery: unknown): Promise<PurchaseLotDTO[]> {
    const filters = listPurchaseLotsQuerySchema.parse(rawQuery ?? {});
    const rows = await this.repo.list(filters);
    const dtos = rows.map(toPurchaseLotDTO);

    if (filters.status) {
      return dtos.filter((d) => d.status === filters.status);
    }
    return dtos;
  }

  async getById(rawId: string): Promise<PurchaseLotDTO> {
    const id = purchaseLotIdSchema.parse(rawId);
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundError("Purchase lot / PO", id);
    return toPurchaseLotDTO(row);
  }

  async getByCode(rawCode: string): Promise<PurchaseLotDTO> {
    const parsed = parseScanPayload(rawCode);
    if (!parsed.code) {
      throw new BadRequestError("Lot / PO code is required.");
    }
    const row = await this.repo.findByLotCode(parsed.code);
    if (!row) throw new NotFoundError("Purchase lot / PO", parsed.code);
    return toPurchaseLotDTO(row);
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

            // If created directly in "delivered" state, restock stock immediately
            if (initialStatus === "delivered") {
              await db
                .update(consumables)
                .set({
                  currentQty: existing.currentQty + item.quantity,
                  lastRestocked: new Date(),
                  updatedAt: new Date(),
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
          } else {
            // New consumable registration
            itemCode = generateOperationalCode("ITM");
            const initialQty = initialStatus === "delivered" ? item.quantity : 0;
            const [newConsumable] = await db
              .insert(consumables)
              .values({
                itemCode,
                name: itemName,
                category: item.category || "General Supply",
                unit: item.unit || "pcs",
                currentQty: initialQty,
                minThreshold: item.minThreshold ?? 5,
                location: item.location || "Main Property Storage",
                supplier: resolvedSupplierName || item.suggestedDealer || undefined,
                lastRestocked: initialStatus === "delivered" ? new Date() : undefined,
                notes: body.notes,
              })
              .returning();
            consumableId = newConsumable.id;

            if (initialStatus === "delivered") {
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
            // New Asset registration
            itemCode = generateOperationalCode("AST");
            const [newAsset] = await db
              .insert(assets)
              .values({
                assetCode: itemCode,
                name: itemName,
                category: item.category || "Equipment",
                status: initialStatus === "delivered" ? "active" : "needs_repair",
                assignmentType: item.assignmentType || "borrowable",
                location: item.location || "Property Custodian Depot",
                purchaseDate: body.poDate,
                value: formatMoney(item.unitCost),
                supplierId: supplierId || undefined,
                notes: `Acquired via PO ${poNumber}`,
              })
              .returning();
            assetId = newAsset.id;
          }
        }

        const unitCost = formatMoney(item.unitCost);
        const totalCost = formatMoney(Number(unitCost) * item.quantity);
        const lotCode = generateOperationalCode("PO");

        const serializedNotes = serializeNotesMetadata({
          notes: body.notes,
          status: initialStatus,
          purpose: item.purpose || body.purpose,
          receiptUrl: body.receiptUrl,
          approvedByName,
          approvedAt,
          orderedAt,
          deliveredAt,
        });

        const row = await this.repo.create(
          {
            lotCode,
            itemType: item.itemType,
            consumableId,
            assetId,
            itemCode,
            itemName,
            supplierId,
            supplierName: resolvedSupplierName || item.suggestedDealer || null,
            quantity: item.quantity,
            quantityRemaining: initialStatus === "delivered" ? item.quantity : 0,
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

      // Write Audit Log for PO Creation
      await db.insert(auditLogs).values({
        entityType: "purchase_order",
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
          supplierName: resolvedSupplierName,
        },
      });

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

      if (nextStatus === "delivered" && currentMeta.status !== "delivered") {
        const orderedQty = lot.quantity;
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

        if (lot.itemType === "consumable" && lot.consumableId) {
          const [consumable] = await db
            .select()
            .from(consumables)
            .where(eq(consumables.id, lot.consumableId))
            .limit(1);

          if (consumable) {
            const unit = Number(lot.unitCost) || 0;
            const lineTotal = formatMoney(unit * receivedQty);

            await db
              .update(consumables)
              .set({
                currentQty: consumable.currentQty + receivedQty,
                lastRestocked: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(consumables.id, lot.consumableId));

            // Record stock movement for actual received qty
            await db.insert(stockMovements).values({
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
                  ? `Delivered via PO ${lot.reference || lot.lotCode}`
                  : `Delivered via PO ${lot.reference || lot.lotCode} — received ${receivedQty} of ${orderedQty} ordered`,
              actorUserId: actor.userId,
              actorName: actor.displayName,
            });
          }
        }

        if (lot.itemType === "asset" && lot.assetId) {
          await db
            .update(assets)
            .set({
              status: "active",
              updatedAt: new Date(),
            })
            .where(eq(assets.id, lot.assetId));
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

      const poCode = lot.reference || lot.lotCode;

      await db.insert(auditLogs).values({
        entityType: "purchase_order",
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
      });

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

      const poCode = resolvedReference || lot.reference || lot.lotCode;
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

      await db.insert(auditLogs).values({
        entityType: "purchase_order",
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
      });

      return toPurchaseLotDTO(updated ?? lot);
    });
  }

  /**
   * Delete or Cancel PO.
   */
  async deletePurchaseOrder(id: string, actor: ActorContext): Promise<boolean> {
    return withTransaction(async (session) => {
      const db = session ?? getDb();
      const lot = await this.repo.findByIdForUpdate(id, session);
      if (!lot) {
        throw new NotFoundError("Purchase Order lot", id);
      }

      const poCode = lot.reference || lot.lotCode;
      const meta = parseNotesMetadata(lot.notes);

      // If delivered and already drawn down, prevent hard delete
      if (meta.status === "delivered" && lot.quantityRemaining < lot.quantity) {
        throw new BadRequestError(
          "Cannot delete a delivered PO that has already been drawn or issued. Cancel the order instead."
        );
      }

      const ok = await this.repo.delete(id, session);

      await db.insert(auditLogs).values({
        entityType: "purchase_order",
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
      });

      return ok;
    });
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
