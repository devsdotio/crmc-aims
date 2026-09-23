import { inArray } from "drizzle-orm";
import { z } from "zod";

import { generateOperationalCode } from "@/server/shared/codes";
import type { ActorContext } from "@/server/shared/auth";
import { getDb } from "@/server/db";
import { withTransaction, type DbSession } from "@/server/db/transaction";
import { departments, projects, type StockMovementRow } from "@/server/db/schema";
import type { LotCostAllocation } from "@/server/modules/purchase-lots/purchase-lot.service";
import { PurchaseLotRepository } from "@/server/modules/purchase-lots/purchase-lot.repository";
import { ProjectExpenseRepository } from "@/server/modules/projects/project-expense.repository";
import type { ProjectExpenseMetadata } from "@/server/db/schema";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/server/shared/errors";
import {
  departmentHolderLabel,
  projectHolderLabel,
} from "@/lib/assets-custody";
import { ConsumableRepository } from "@/server/modules/consumables/consumable.repository";
import { consumableIdSchema } from "@/server/modules/consumables/consumable.validation";

import {
  StockMovementRepository,
  isVoidedNotes,
  reversesMarker,
  voidedMarker,
  type StockMovementListRow,
} from "./stock-movement.repository";

export type StockMovementReason = "restock" | "issue" | "adjust";
export type StockMovementDirection = "in" | "out";

export type RecordMovementLine = {
  qty: number;
  purchaseLotId?: string | null;
  lotCode?: string | null;
  unitCost?: string | null;
  lineTotal?: string | null;
};

export type RecordStockMovementsInput = {
  consumableId: string;
  direction: StockMovementDirection;
  reason: StockMovementReason;
  actor: ActorContext;
  departmentId?: string | null;
  projectId?: string | null;
  requestId?: string | null;
  notes?: string | null;
  lines: RecordMovementLine[];
};

export function allocationsToMovementLines(
  allocations: LotCostAllocation[]
): RecordMovementLine[] {
  return allocations.map((a) => ({
    qty: a.quantity,
    purchaseLotId: a.lotId,
    lotCode: a.lotCode,
    unitCost: a.unitCost,
    lineTotal: a.total,
  }));
}

export type StockMovementDTO = {
  id: string;
  movementCode: string;
  consumableId: string;
  itemCode?: string;
  itemName?: string;
  unit?: string;
  qty: number;
  direction: StockMovementDirection;
  reason: StockMovementReason;
  departmentId: string | null;
  projectId: string | null;
  destinationLabel: string | null;
  purchaseLotId: string | null;
  lotCode: string | null;
  unitCost: string | null;
  lineTotal: string | null;
  requestId: string | null;
  notes: string | null;
  actorName: string;
  createdAt: string;
  /** True when this out/issue was undone (soft-void). */
  voided?: boolean;
  /** Compensating restock movement code, if voided. */
  reversalMovementCode?: string | null;
  /** True when this row is a compensating undo restock. */
  isReversal?: boolean;
};

export const listStockMovementsQuerySchema = z.object({
  reason: z.enum(["restock", "issue", "adjust"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  /** Optional for staff filters; borrowers always use session departmentId. */
  departmentId: z.string().uuid().optional(),
  classification: z.enum(["supply", "material"]).optional(),
  includeSandbox: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "boolean") return v;
      return v === "true" || v === "1";
    }),
});

export const voidStockMovementSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "Mistaken or incorrect issue")),
});

export const stockMovementIdSchema = z.string().uuid("Invalid stock movement id.");

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

async function destinationLabelsFor(
  rows: Array<{ departmentId: string | null; projectId: string | null }>,
  tenantId?: string
): Promise<Map<string, string>> {
  const deptIds = [
    ...new Set(rows.map((r) => r.departmentId).filter((id): id is string => Boolean(id))),
  ];
  const projectIds = [
    ...new Set(rows.map((r) => r.projectId).filter((id): id is string => Boolean(id))),
  ];

  const db = getDb();
  const labels = new Map<string, string>();

  if (deptIds.length > 0) {
    const { and, eq } = await import("drizzle-orm");
    const conditions = [inArray(departments.id, deptIds)];
    if (tenantId) conditions.push(eq(departments.tenantId, tenantId));
    const depts = await db
      .select({
        id: departments.id,
        code: departments.code,
        name: departments.name,
      })
      .from(departments)
      .where(and(...conditions));
    for (const d of depts) {
      labels.set(`d:${d.id}`, departmentHolderLabel(d.code, d.name));
    }
  }
  if (projectIds.length > 0) {
    const { and, eq } = await import("drizzle-orm");
    const conditions = [inArray(projects.id, projectIds)];
    if (tenantId) conditions.push(eq(projects.tenantId, tenantId));
    const projs = await db
      .select({
        id: projects.id,
        code: projects.projectCode,
        name: projects.name,
      })
      .from(projects)
      .where(and(...conditions));
    for (const p of projs) {
      labels.set(`p:${p.id}`, projectHolderLabel(p.code, p.name));
    }
  }
  return labels;
}

function destinationLabel(
  row: { departmentId: string | null; projectId: string | null },
  labels: Map<string, string>
): string | null {
  if (row.departmentId) return labels.get(`d:${row.departmentId}`) ?? null;
  if (row.projectId) return labels.get(`p:${row.projectId}`) ?? null;
  return null;
}

function toDTO(
  row: StockMovementRow | StockMovementListRow,
  labels: Map<string, string>,
  extras?: {
    voided?: boolean;
    reversalMovementCode?: string | null;
    isReversal?: boolean;
  }
): StockMovementDTO {
  const listed = row as StockMovementListRow;
  return {
    id: row.id,
    movementCode: row.movementCode,
    consumableId: row.consumableId,
    itemCode: listed.itemCode,
    itemName: listed.itemName,
    unit: listed.unit,
    qty: row.qty,
    direction: row.direction,
    reason: row.reason,
    departmentId: row.departmentId,
    projectId: row.projectId,
    destinationLabel: destinationLabel(row, labels),
    purchaseLotId: row.purchaseLotId,
    lotCode: row.lotCode,
    unitCost: row.unitCost,
    lineTotal: row.lineTotal,
    requestId: row.requestId,
    notes: row.notes,
    actorName: row.actorName,
    createdAt: toIso(row.createdAt),
    voided: extras?.voided ?? isVoidedNotes(row.notes),
    reversalMovementCode: extras?.reversalMovementCode ?? null,
    isReversal: extras?.isReversal ?? Boolean(row.notes?.includes("[REVERSES:")),
  };
}

export class StockMovementService {
  constructor(
    private readonly repo = new StockMovementRepository(),
    private readonly consumables = new ConsumableRepository(),
    private readonly lots = new PurchaseLotRepository(),
    private readonly projectExpenses = new ProjectExpenseRepository()
  ) {}

  async record(
    input: RecordStockMovementsInput,
    session?: DbSession
  ): Promise<StockMovementRow[]> {
    if (input.lines.length === 0) return [];
    return this.repo.createMany(
      input.lines.map((line) => ({
        tenantId: input.actor.tenantId,
        movementCode: generateOperationalCode("MOV"),
        consumableId: input.consumableId,
        qty: line.qty,
        direction: input.direction,
        reason: input.reason,
        departmentId: input.departmentId ?? null,
        projectId: input.projectId ?? null,
        purchaseLotId: line.purchaseLotId ?? null,
        lotCode: line.lotCode ?? null,
        unitCost: line.unitCost ?? null,
        lineTotal: line.lineTotal ?? null,
        requestId: input.requestId ?? null,
        notes: input.notes ?? null,
        actorUserId: input.actor.userId,
        actorName: input.actor.displayName,
      })),
      session
    );
  }

  async listByConsumable(rawId: string, actorTenantId?: string): Promise<StockMovementDTO[]> {
    const id = consumableIdSchema.parse(rawId);
    const item = await this.consumables.findById(id, undefined, actorTenantId);
    if (!item) throw new NotFoundError("Consumable", id);

    const rows = await this.repo.listByConsumableId(id, undefined, actorTenantId);
    const labels = await destinationLabelsFor(rows, actorTenantId);
    const issueIds = rows
      .filter((r) => r.direction === "out" && r.reason === "issue")
      .map((r) => r.id);
    const reversals = await this.repo.findReversalsForIds(issueIds, undefined, actorTenantId);

    return rows.map((row) => {
      const reversal = reversals.get(row.id);
      return toDTO(
        { ...row, itemCode: item.itemCode, itemName: item.name, unit: item.unit },
        labels,
        {
          voided: Boolean(reversal) || isVoidedNotes(row.notes),
          reversalMovementCode: reversal?.movementCode ?? null,
        }
      );
    });
  }

  async list(
    rawQuery: unknown,
    actor?: ActorContext
  ): Promise<StockMovementDTO[]> {
    const query = listStockMovementsQuerySchema.parse(rawQuery);

    // Never trust client departmentId for borrowers — session only.
    let departmentId: string | undefined;
    if (actor?.role === "borrower") {
      if (!actor.departmentId) {
        throw new BadRequestError(
          "Your account is not linked to a department. Ask Property Custodian to assign one."
        );
      }
      departmentId = actor.departmentId;
    } else if (query.departmentId) {
      departmentId = query.departmentId;
    }

    const rows = await this.repo.listRecent({
      reason: query.reason,
      limit: query.limit,
      includeSandbox: query.includeSandbox,
      tenantId: actor?.tenantId,
      departmentId,
      classification: query.classification,
    });
    const labels = await destinationLabelsFor(rows, actor?.tenantId);
    const issueIds = rows
      .filter((r) => r.direction === "out" && r.reason === "issue")
      .map((r) => r.id);
    const reversals = await this.repo.findReversalsForIds(
      issueIds,
      undefined,
      actor?.tenantId
    );

    return rows.map((row) => {
      const reversal = reversals.get(row.id);
      const dto = toDTO(row, labels, {
        voided: Boolean(reversal) || isVoidedNotes(row.notes),
        reversalMovementCode: reversal?.movementCode ?? null,
      });
      if (actor?.role === "borrower") {
        return {
          ...dto,
          unitCost: null,
          lineTotal: null,
          purchaseLotId: null,
        };
      }
      return dto;
    });
  }

  /**
   * Soft-undo a mistaken consumable issue:
   * restore lot remaining + on-hand qty, write compensating restock,
   * remove matching project expense charge when present.
   * Keeps the original MOV row for audit.
   */
  async voidIssue(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<StockMovementDTO> {
    const id = stockMovementIdSchema.parse(rawId);
    const input = voidStockMovementSchema.parse(rawInput ?? {});

    return withTransaction(async (tx) => {
      const existing = await this.repo.findByIdForUpdate(id, tx, actor.tenantId);
      if (!existing) throw new NotFoundError("Stock movement", id);

      if (existing.direction !== "out" || existing.reason !== "issue") {
        throw new BadRequestError(
          "Only consumable issue movements can be undone."
        );
      }
      if (isVoidedNotes(existing.notes)) {
        throw new ConflictError("This issue has already been undone.");
      }

      const prior = await this.repo.findReversalOf(
        existing.id,
        tx,
        actor.tenantId
      );
      if (prior) {
        throw new ConflictError("This issue has already been undone.");
      }

      const item = await this.consumables.findByIdForUpdate(
        existing.consumableId,
        tx,
        actor.tenantId
      );
      if (!item) {
        throw new NotFoundError("Consumable", existing.consumableId);
      }

      if (existing.purchaseLotId) {
        const lot = await this.lots.findByIdForUpdate(
          existing.purchaseLotId,
          tx,
          actor.tenantId
        );
        if (lot) {
          await this.lots.updateRemaining(
            lot.id,
            lot.quantityRemaining + existing.qty,
            tx,
            actor.tenantId
          );
        }
      }

      await this.consumables.update(
        item.id,
        { currentQty: item.currentQty + existing.qty },
        tx,
        actor.tenantId
      );

      const reasonText = input.reason;
      const reverseNotes = `${reversesMarker(existing.id)} Undone mistaken issue ${existing.movementCode}: ${reasonText}`;

      const reversal = await this.repo.create(
        {
          tenantId: existing.tenantId ?? actor.tenantId,
          movementCode: generateOperationalCode("MOV"),
          consumableId: existing.consumableId,
          qty: existing.qty,
          direction: "in",
          reason: "restock",
          departmentId: existing.departmentId,
          projectId: existing.projectId,
          purchaseLotId: existing.purchaseLotId,
          lotCode: existing.lotCode,
          unitCost: existing.unitCost,
          lineTotal: existing.lineTotal,
          requestId: existing.requestId,
          notes: reverseNotes,
          actorUserId: actor.userId,
          actorName: actor.displayName,
        },
        tx
      );

      const nextNotes = [existing.notes?.trim(), `${voidedMarker()} ${reasonText}`]
        .filter(Boolean)
        .join(" · ");
      const updated = await this.repo.updateNotes(
        existing.id,
        nextNotes,
        tx,
        actor.tenantId
      );
      if (!updated) throw new NotFoundError("Stock movement", id);

      if (existing.projectId) {
        await this.removeMatchingProjectExpense(existing, tx);
      }

      const labels = await destinationLabelsFor([updated]);
      const consumable = await this.consumables.findById(
        item.id,
        tx,
        actor.tenantId
      );
      return toDTO(
        {
          ...updated,
          itemCode: consumable?.itemCode,
          itemName: consumable?.name,
          unit: consumable?.unit,
        } as StockMovementListRow,
        labels,
        {
          voided: true,
          reversalMovementCode: reversal.movementCode,
        }
      );
    });
  }

  private async removeMatchingProjectExpense(
    movement: StockMovementRow,
    tx: DbSession
  ): Promise<void> {
    if (!movement.projectId) return;

    const expenses = await this.projectExpenses.listByProject(
      movement.projectId,
      tx,
      movement.tenantId
    );
    const candidates = expenses.filter((e) => {
      if (e.lineType !== "consumable") return false;
      if (e.consumableId !== movement.consumableId) return false;

      const meta = (e.metadata ?? {}) as ProjectExpenseMetadata;
      const linkedIds =
        meta.stockMovementIds ??
        (meta.stockMovementId ? [meta.stockMovementId] : []);

      if (linkedIds.length > 0) {
        if (!linkedIds.includes(movement.id)) return false;
        // Multi-lot charge: only drop when this MOV covers the full expense qty.
        if (linkedIds.length > 1) {
          return Math.round(Number(e.quantity ?? 0)) === movement.qty;
        }
        return true;
      }

      if (Math.round(Number(e.quantity ?? 0)) !== movement.qty) return false;

      const allocs = meta.lotAllocations ?? [];
      if (movement.purchaseLotId && allocs.length > 0) {
        return allocs.some(
          (a) =>
            a.lotId === movement.purchaseLotId && a.quantity === movement.qty
        );
      }

      // Legacy unlinked rows: same item/qty, closest timestamp wins below.
      return true;
    });

    if (candidates.length === 0) return;

    const movementTime = new Date(movement.createdAt).getTime();
    candidates.sort(
      (a, b) =>
        Math.abs(new Date(a.createdAt).getTime() - movementTime) -
        Math.abs(new Date(b.createdAt).getTime() - movementTime)
    );
    // Repository delete only — stock already restored above (avoid double restock).
    await this.projectExpenses.delete(
      candidates[0].id,
      tx,
      movement.tenantId
    );
  }
}
