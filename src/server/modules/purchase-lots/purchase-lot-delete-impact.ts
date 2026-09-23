/**
 * TEMPORARY: PO force-delete with inventory revert — remove when cleanup window ends.
 *
 * Preview + atomic delete for an entire PO (all line lots sharing a poNumber).
 * Blocks when post-delivery stock was drawn or PO-minted assets are in custody.
 */

import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";

import {
  assets,
  borrowTransactions,
  consumables,
  consumableRequestReleaseAllocations,
  projectAssetAssignments,
  projectExpenseLines,
  purchaseLots,
  stockMovements,
  type PurchaseLotRow,
} from "@/server/db/schema";
import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { withTransaction } from "@/server/db/transaction";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/server/shared/errors";
import type { ActorContext } from "@/server/shared/auth";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";
import { findActivePoDisbursement } from "./po-disbursement";
import { deletePoDepartmentLinks } from "./po-departments";
import { PurchaseLotRepository } from "./purchase-lot.repository";
import type {
  PoDeleteAssetUnit,
  PoDeleteImpact,
  PoDeleteLineEffect,
  PurchaseOrderStatus,
} from "./purchase-lot.types";

/** Minimal notes parse — avoids circular import with purchase-lot.service. */
function parseLotNotes(rawNotes?: string | null): {
  status: PurchaseOrderStatus;
  receivedQuantity: number | null;
} {
  let status: PurchaseOrderStatus = "pending_approval";
  let receivedQuantity: number | null = null;
  if (!rawNotes) return { status, receivedQuantity };
  const trimmed = rawNotes.trim();
  if (trimmed.startsWith("{") && trimmed.includes('"status"')) {
    try {
      const meta = JSON.parse(trimmed) as {
        status?: PurchaseOrderStatus;
        receivedQuantity?: number;
      };
      if (meta.status) status = meta.status;
      if (typeof meta.receivedQuantity === "number") {
        receivedQuantity = meta.receivedQuantity;
      }
    } catch {
      /* raw */
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
  }
  return { status, receivedQuantity };
}

function receivedQtyForLot(lot: PurchaseLotRow): number {
  const meta = parseLotNotes(lot.notes);
  if (typeof meta.receivedQuantity === "number" && meta.receivedQuantity > 0) {
    return meta.receivedQuantity;
  }
  return lot.quantity;
}

function lotStatus(lot: PurchaseLotRow): PurchaseOrderStatus {
  return parseLotNotes(lot.notes).status;
}

/** Resolve primary + sibling units minted for this PO line. */
export async function resolvePoMintedAssets(
  lot: PurchaseLotRow,
  poNumber: string,
  session?: DbSession
): Promise<PoDeleteAssetUnit[]> {
  const db = session ?? getDb();
  const byId = new Map<string, PoDeleteAssetUnit>();

  const add = (row: {
    id: string;
    assetCode: string;
    name: string;
    status: string;
    currentHolder: string | null;
    reservedForRequestId: string | null;
  }) => {
    byId.set(row.id, {
      id: row.id,
      assetCode: row.assetCode,
      name: row.name,
      status: row.status,
      currentHolder: row.currentHolder,
      reservedForRequestId: row.reservedForRequestId,
    });
  };

  if (lot.assetId) {
    const [primary] = await db
      .select({
        id: assets.id,
        assetCode: assets.assetCode,
        name: assets.name,
        status: assets.status,
        currentHolder: assets.currentHolder,
        reservedForRequestId: assets.reservedForRequestId,
      })
      .from(assets)
      .where(eq(assets.id, lot.assetId))
      .limit(1);
    if (primary) add(primary);
  }

  const noteNeedle = `%Acquired via PO ${poNumber}%`;
  const siblingConditions = [
    ilike(assets.notes, noteNeedle),
    eq(assets.name, lot.itemName),
  ];
  if (lot.tenantId) {
    siblingConditions.push(eq(assets.tenantId, lot.tenantId));
  }

  const siblings = await db
    .select({
      id: assets.id,
      assetCode: assets.assetCode,
      name: assets.name,
      status: assets.status,
      currentHolder: assets.currentHolder,
      reservedForRequestId: assets.reservedForRequestId,
    })
    .from(assets)
    .where(and(...siblingConditions));

  for (const s of siblings) add(s);

  return [...byId.values()];
}

async function assetCustodyBlockers(
  units: PoDeleteAssetUnit[],
  session?: DbSession
): Promise<string[]> {
  if (units.length === 0) return [];
  const db = session ?? getDb();
  const messages: string[] = [];
  const ids = units.map((u) => u.id);

  for (const u of units) {
    if (u.currentHolder) {
      messages.push(
        `${u.assetCode} is held by ${u.currentHolder} — return it before deleting this PO.`
      );
    }
    if (u.reservedForRequestId) {
      messages.push(
        `${u.assetCode} is reserved for an open request — clear the reservation first.`
      );
    }
  }

  const openBorrows = await db
    .select({
      assetId: borrowTransactions.assetId,
      assetCode: borrowTransactions.assetCode,
      borrowerName: borrowTransactions.borrowerName,
    })
    .from(borrowTransactions)
    .where(
      and(
        inArray(borrowTransactions.assetId, ids),
        eq(borrowTransactions.status, "active")
      )
    );

  for (const b of openBorrows) {
    messages.push(
      `${b.assetCode} has an active custody log (${b.borrowerName}) — return it first.`
    );
  }

  const openProjects = await db
    .select({
      assetId: projectAssetAssignments.assetId,
      assetCode: projectAssetAssignments.assetCode,
      projectId: projectAssetAssignments.projectId,
    })
    .from(projectAssetAssignments)
    .where(
      and(
        inArray(projectAssetAssignments.assetId, ids),
        eq(projectAssetAssignments.status, "assigned")
      )
    );

  for (const p of openProjects) {
    messages.push(
      `${p.assetCode} is assigned to a project — return it from the project first.`
    );
  }

  return messages;
}

async function movementsForLot(
  lotId: string,
  lotCode: string,
  session?: DbSession
) {
  const db = session ?? getDb();
  return db
    .select()
    .from(stockMovements)
    .where(
      or(
        eq(stockMovements.purchaseLotId, lotId),
        and(
          eq(stockMovements.lotCode, lotCode),
          sql`${stockMovements.purchaseLotId} is null`
        )
      )!
    );
}

async function releaseAllocsForLot(lotId: string, session?: DbSession) {
  const db = session ?? getDb();
  return db
    .select()
    .from(consumableRequestReleaseAllocations)
    .where(eq(consumableRequestReleaseAllocations.purchaseLotId, lotId));
}

async function expensesForLot(lotId: string, session?: DbSession) {
  const db = session ?? getDb();
  return db
    .select()
    .from(projectExpenseLines)
    .where(
      sql`(${projectExpenseLines.metadata}->>'purchaseLotId') = ${lotId}`
    );
}

async function buildLineImpact(
  lot: PurchaseLotRow,
  poNumber: string,
  session?: DbSession
): Promise<{
  line: PoDeleteLineEffect;
  blockers: { lotId: string; itemName: string; code: string; message: string }[];
}> {
  const db = session ?? getDb();
  const status = lotStatus(lot);
  const blockers: {
    lotId: string;
    itemName: string;
    code: string;
    message: string;
  }[] = [];
  const effects: string[] = [];
  const receivedQty = receivedQtyForLot(lot);

  let qtyToReverse: number | undefined;
  let assetsToDelete: PoDeleteAssetUnit[] | undefined;
  let movementsToRemove = 0;
  let expensesToRemove = 0;

  if (lot.itemType === "asset") {
    const units = await resolvePoMintedAssets(lot, poNumber, session);
    assetsToDelete = units;
    if (units.length > 0) {
      effects.push(
        `Delete ${units.length} asset unit(s): ${units
          .map((u) => u.assetCode)
          .join(", ")}`
      );
    } else {
      effects.push("Delete purchase lot (no linked asset units found)");
    }

    const custody = await assetCustodyBlockers(units, session);
    for (const msg of custody) {
      blockers.push({
        lotId: lot.id,
        itemName: lot.itemName,
        code: "asset_in_custody",
        message: msg,
      });
    }
  } else if (status !== "delivered") {
    effects.push("Delete purchase lot (not yet delivered — no stock intake to reverse)");
    if (lot.assetId) {
      const units = await resolvePoMintedAssets(lot, poNumber, session);
      assetsToDelete = units;
      if (units.length) {
        effects.push(
          `Remove placeholder asset(s): ${units.map((u) => u.assetCode).join(", ")}`
        );
        const custody = await assetCustodyBlockers(units, session);
        for (const msg of custody) {
          blockers.push({
            lotId: lot.id,
            itemName: lot.itemName,
            code: "asset_in_custody",
            message: msg,
          });
        }
      }
    }
  } else if (lot.projectId) {
    // Project direct delivery: net on-hand flat; reverse expense + PO movement pair only.
    const movs = await movementsForLot(lot.id, lot.lotCode, session);
    const expenses = await expensesForLot(lot.id, session);
    const allocs = await releaseAllocsForLot(lot.id, session);

    const outBeyondPo = movs.filter(
      (m) =>
        m.direction === "out" &&
        !(
          m.reason === "issue" &&
          (m.notes?.includes("Direct project delivery") ||
            m.notes?.includes(`via PO ${poNumber}`))
        )
    );
    const extraOut = outBeyondPo.length > 0;
    const hasReleaseAllocs = allocs.length > 0;

    // Auto-issue sets remaining to 0 — that alone is NOT a blocker for project POs.
    if (extraOut || hasReleaseAllocs) {
      blockers.push({
        lotId: lot.id,
        itemName: lot.itemName,
        code: "lot_drawn",
        message: hasReleaseAllocs
          ? `"${lot.itemName}" has supply-release allocations from this lot — undo those releases first.`
          : `"${lot.itemName}" has additional issues beyond the PO project delivery — undo them first.`,
      });
    }

    movementsToRemove = movs.length;
    expensesToRemove = expenses.length;
    effects.push(
      `Remove ${expenses.length} project expense line(s) and ${movs.length} stock movement(s) for direct project delivery (on-hand unchanged)`
    );
  } else {
    // Warehouse delivered consumable
    const movs = await movementsForLot(lot.id, lot.lotCode, session);
    const allocs = await releaseAllocsForLot(lot.id, session);

    if (lot.quantityRemaining < lot.quantity) {
      blockers.push({
        lotId: lot.id,
        itemName: lot.itemName,
        code: "lot_drawn",
        message: `"${lot.itemName}" has been drawn or issued (${lot.quantityRemaining} of ${lot.quantity} remaining). Return stock to this lot before deleting.`,
      });
    }
    if (allocs.length > 0) {
      blockers.push({
        lotId: lot.id,
        itemName: lot.itemName,
        code: "release_allocations",
        message: `"${lot.itemName}" has ${allocs.length} release allocation(s) against this lot.`,
      });
    }

    qtyToReverse = receivedQty;
    if (lot.consumableId) {
      const [cons] = await db
        .select({ id: consumables.id, currentQty: consumables.currentQty })
        .from(consumables)
        .where(eq(consumables.id, lot.consumableId))
        .limit(1);
      if (cons && cons.currentQty < receivedQty) {
        blockers.push({
          lotId: lot.id,
          itemName: lot.itemName,
          code: "insufficient_on_hand",
          message: `On-hand qty (${cons.currentQty}) is less than received qty (${receivedQty}) for "${lot.itemName}" — cannot reverse without going negative.`,
        });
      }
    }

    movementsToRemove = movs.length;
    effects.push(
      `Subtract ${receivedQty} from on-hand and remove ${movs.length} stock movement(s)`
    );
  }

  effects.push(`Delete purchase lot ${lot.lotCode}`);

  return {
    line: {
      lotId: lot.id,
      lotCode: lot.lotCode,
      itemName: lot.itemName,
      itemType: lot.itemType as "consumable" | "asset",
      status,
      projectId: lot.projectId ?? null,
      effects,
      qtyToReverse,
      assetsToDelete,
      movementsToRemove,
      expensesToRemove,
    },
    blockers,
  };
}

export async function computePoDeleteImpact(
  poNumber: string,
  tenantId: string | undefined,
  repo: PurchaseLotRepository,
  session?: DbSession
): Promise<PoDeleteImpact> {
  const trimmed = poNumber.trim();
  if (!trimmed) {
    throw new BadRequestError("poNumber is required.");
  }

  const lots = await repo.listByPoNumber(trimmed, session, tenantId);
  if (lots.length === 0) {
    throw new NotFoundError("Purchase Order", trimmed);
  }

  const lines: PoDeleteLineEffect[] = [];
  const blockers: PoDeleteImpact["blockers"] = [];
  const warnings: string[] = [];

  for (const lot of lots) {
    const { line, blockers: lineBlockers } = await buildLineImpact(
      lot,
      trimmed,
      session
    );
    lines.push(line);
    blockers.push(...lineBlockers);
  }

  const disbursement = await findActivePoDisbursement(trimmed, tenantId);
  if (disbursement) {
    warnings.push(
      `Linked ${disbursement.kind === "voucher" ? "voucher" : "petty cash"} ${disbursement.code} (${disbursement.status}) will not be deleted — clear or cancel it separately if needed.`
    );
  }

  return {
    poNumber: trimmed,
    canDelete: blockers.length === 0,
    lineCount: lots.length,
    lines,
    blockers,
    warnings,
  };
}

async function revertLine(
  lot: PurchaseLotRow,
  poNumber: string,
  session: DbSession
): Promise<void> {
  const db = session;
  const status = lotStatus(lot);
  const receivedQty = receivedQtyForLot(lot);

  if (lot.itemType === "asset" || (status !== "delivered" && lot.assetId)) {
    const units = await resolvePoMintedAssets(lot, poNumber, session);
    if (lot.assetId) {
      await db
        .update(purchaseLots)
        .set({ assetId: null, updatedAt: new Date() })
        .where(eq(purchaseLots.id, lot.id));
    }
    const ids = units.map((u) => u.id);
    if (ids.length > 0) {
      // Clear non-active assignment history so FK restrict does not block hard delete.
      await db
        .delete(projectAssetAssignments)
        .where(inArray(projectAssetAssignments.assetId, ids));
      await db.delete(assets).where(inArray(assets.id, ids));
    }
  }

  if (lot.itemType === "consumable" && status === "delivered") {
    const movs = await movementsForLot(lot.id, lot.lotCode, session);
    const movIds = movs.map((m) => m.id);

    if (lot.projectId) {
      const expenses = await expensesForLot(lot.id, session);
      for (const exp of expenses) {
        await db
          .delete(projectExpenseLines)
          .where(eq(projectExpenseLines.id, exp.id));
      }
      if (movIds.length > 0) {
        await db.delete(stockMovements).where(inArray(stockMovements.id, movIds));
      }
      // Net on-hand already flat — do not adjust currentQty.
    } else {
      if (lot.consumableId && receivedQty > 0) {
        const [cons] = await db
          .select()
          .from(consumables)
          .where(eq(consumables.id, lot.consumableId))
          .for("update")
          .limit(1);
        if (cons) {
          const next = cons.currentQty - receivedQty;
          if (next < 0) {
            throw new ConflictError(
              `Cannot reverse "${lot.itemName}": on-hand would go negative.`
            );
          }
          await db
            .update(consumables)
            .set({ currentQty: next, updatedAt: new Date() })
            .where(eq(consumables.id, lot.consumableId));
        }
      }
      if (movIds.length > 0) {
        await db.delete(stockMovements).where(inArray(stockMovements.id, movIds));
      }
    }
  }

  await db.delete(purchaseLots).where(eq(purchaseLots.id, lot.id));
}

export async function deletePurchaseOrderWithRevert(
  poNumber: string,
  actor: ActorContext,
  repo: PurchaseLotRepository,
  auditLogs: AuditLogService = new AuditLogService()
): Promise<PoDeleteImpact> {
  const trimmed = poNumber.trim();
  if (!trimmed) {
    throw new BadRequestError("poNumber is required.");
  }

  return withTransaction(async (session) => {
    const impact = await computePoDeleteImpact(
      trimmed,
      actor.tenantId,
      repo,
      session
    );

    if (!impact.canDelete) {
      const summary = impact.blockers.map((b) => b.message).join(" ");
      throw new ConflictError(
        `Cannot delete PO ${trimmed}: ${summary || "One or more blockers prevent deletion."}`
      );
    }

    const lots = await repo.listByPoNumber(trimmed, session, actor.tenantId);
    for (const lot of lots) {
      await repo.findByIdForUpdate(lot.id, session, actor.tenantId);
    }

    // Re-check after locks
    const lockedImpact = await computePoDeleteImpact(
      trimmed,
      actor.tenantId,
      repo,
      session
    );
    if (!lockedImpact.canDelete) {
      throw new ConflictError(
        `Cannot delete PO ${trimmed}: inventory changed while confirming. Refresh and try again.`
      );
    }

    const freshLots = await repo.listByPoNumber(
      trimmed,
      session,
      actor.tenantId
    );
    for (const lot of freshLots) {
      await revertLine(lot, trimmed, session);
    }

    // Drop project multi-dept links keyed by PO number (join is PO-scoped, not per-lot).
    await deletePoDepartmentLinks(trimmed, actor.tenantId, session);

    await auditLogs.log(
      {
        entityType: AUDIT_ENTITY.purchaseOrder,
        entityId: trimmed,
        action: "purchase_order_force_deleted",
        actorName: actor.displayName,
        actorUserId: actor.userId,
        notes: `TEMPORARY force-delete of PO ${trimmed} (${freshLots.length} line(s)) with inventory revert.`,
        metadata: {
          poNumber: trimmed,
          lineCount: freshLots.length,
          effects: lockedImpact.lines.map((l) => ({
            lotId: l.lotId,
            effects: l.effects,
          })),
        },
      },
      session
    );

    return lockedImpact;
  });
}
