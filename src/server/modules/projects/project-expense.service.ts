import type {
  ProjectExpenseLineRow,
  ProjectExpenseMetadata,
} from "@/server/db/schema";
import type { ActorContext } from "@/server/shared/auth";
import { todayDateString } from "@/server/shared/codes";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/server/shared/errors";
import { withTransaction } from "@/server/db/transaction";
import { ConsumableRepository } from "@/server/modules/consumables/consumable.repository";
import { PurchaseLotRepository } from "@/server/modules/purchase-lots/purchase-lot.repository";
import {
  StockMovementService,
  allocationsToMovementLines,
} from "@/server/modules/stock-movements/stock-movement.service";
import {
  StockMovementRepository,
  isVoidedNotes,
  reversesMarker,
  voidedMarker,
} from "@/server/modules/stock-movements/stock-movement.repository";

import { ProjectRepository } from "./project.repository";
import { ProjectExpenseRepository } from "./project-expense.repository";
import type { ProjectExpenseLineDTO } from "./project-expense.types";
import {
  batchManualMaterialsSchema,
  createProjectExpenseSchema,
  expenseIdSchema,
  updateProjectExpenseSchema,
  useConsumableOnProjectSchema,
} from "./project-expense.validation";

import { projectIdSchema } from "./project.validation";

function formatMoney(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

function toDTO(row: ProjectExpenseLineRow): ProjectExpenseLineDTO {
  const metadata = (row.metadata ?? {}) as ProjectExpenseMetadata;
  return {
    id: row.id,
    projectId: row.projectId,
    lineType: row.lineType,
    category: row.category,
    categoryLabel: metadata.customCategory ?? null,
    description: row.description,
    amount: formatMoney(row.amount) ?? "0.00",
    quantity: formatMoney(row.quantity),
    unitCost: formatMoney(row.unitCost),
    consumableId: row.consumableId ?? null,
    assetId: row.assetId ?? null,
    incurredOn: row.incurredOn,
    notes: row.notes ?? null,
    recordedByUserId: row.recordedByUserId,
    recordedByName: row.recordedByName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    consumableCode: metadata.consumableCode ?? null,
    consumableName: metadata.consumableName ?? null,
    consumableUnit: metadata.consumableUnit ?? null,
  };
}

/** Normalize project expense lot rows into stock-movement line payloads. */
function expenseAllocationsToMovementLines(
  allocations: Array<{
    lotId?: string | null;
    lotCode?: string | null;
    quantity: number;
    unitCost: string;
    total: string;
  }>
) {
  return allocationsToMovementLines(
    allocations.map((a) => ({
      lotId: a.lotId ?? null,
      lotCode: a.lotCode ?? null,
      quantity: a.quantity,
      unitCost: a.unitCost,
      total: a.total,
    }))
  );
}

export class ProjectExpenseService {
  constructor(
    private readonly expenses = new ProjectExpenseRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly consumables = new ConsumableRepository(),
    private readonly lots = new PurchaseLotRepository(),
    private readonly movements = new StockMovementService(),
    private readonly movementRepo = new StockMovementRepository()
  ) {}

  private async requireMutableProject(projectId: string) {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundError("Project", projectId);
    if (project.status === "completed") {
      throw new ConflictError(
        "Completed projects are read-only. Expense lines cannot be changed."
      );
    }
    return project;
  }

  /** Resolve an expense for a project; list fallback if by-id lookup misses. */
  private async requireExpenseForProject(
    projectId: string,
    expenseId: string
  ): Promise<ProjectExpenseLineRow> {
    let existing = await this.expenses.findById(expenseId);
    if (!existing || existing.projectId !== projectId) {
      const listed = await this.expenses.listByProject(projectId);
      existing =
        listed.find((row) => row.id === expenseId) ??
        listed.find(
          (row) => row.id.toLowerCase() === expenseId.toLowerCase()
        ) ??
        null;
    }
    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundError("Project expense", expenseId);
    }
    return existing;
  }

  async listForProject(rawProjectId: string): Promise<ProjectExpenseLineDTO[]> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundError("Project", projectId);
    const rows = await this.expenses.listByProject(projectId);
    return rows.map(toDTO);
  }

  async create(
    rawProjectId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ProjectExpenseLineDTO> {
    const projectId = projectIdSchema.parse(rawProjectId);
    await this.requireMutableProject(projectId);
    const input = createProjectExpenseSchema.parse(rawInput);

    const lineType = input.lineType;
    const category =
      lineType === "adjustment"
        ? "adjustment"
        : lineType === "material"
          ? "miscellaneous"
          : input.category;

    const metadata: ProjectExpenseMetadata =
      category === "other" && input.categoryLabel?.trim()
        ? { customCategory: input.categoryLabel.trim() }
        : {};

    const quantity = input.quantity;
    let unitCost = input.unitCost;
    if (
      lineType === "material" &&
      quantity &&
      Number(quantity) > 0 &&
      (!unitCost || Number(unitCost) === 0)
    ) {
      unitCost = (Number(input.amount) / Number(quantity)).toFixed(2);
    }

    const row = await this.expenses.create({
      projectId,
      lineType,
      category,
      description: input.description,
      amount: input.amount,
      quantity,
      unitCost,
      consumableId: null,
      assetId: null,
      incurredOn: input.incurredOn ?? todayDateString(),
      notes: input.notes ?? null,
      metadata,
      recordedByUserId: actor.userId,
      recordedByName: actor.displayName,
    });

    return toDTO(row);
  }

  async createBatchManualMaterials(
    rawProjectId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ProjectExpenseLineDTO[]> {
    const projectId = projectIdSchema.parse(rawProjectId);
    await this.requireMutableProject(projectId);
    const { items } = batchManualMaterialsSchema.parse(rawInput);

    return withTransaction(async (tx) => {
      const createdRows: ProjectExpenseLineRow[] = [];
      for (const item of items) {
        const qtyNum = Number(item.quantity);
        const unitNum = Number(item.unitCost);
        const totalAmount = (qtyNum * unitNum).toFixed(2);
        const notesParts = [item.description, item.notes].filter(Boolean);

        const row = await this.expenses.create(
          {
            tenantId: actor.tenantId,
            projectId,
            lineType: "material",
            category: "miscellaneous",
            description: item.materialName,
            amount: totalAmount,
            quantity: item.quantity,
            unitCost: item.unitCost,
            consumableId: null,
            assetId: null,
            incurredOn: item.incurredOn ?? todayDateString(),
            notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
            metadata: {},
            recordedByUserId: actor.userId,
            recordedByName: actor.displayName,
          },
          tx
        );
        createdRows.push(row);
      }
      return createdRows.map(toDTO);
    });
  }


  /**
   * Phase 3: charge inventory to a project.
   * - Always deducts consumable stock
   * - Costs via FIFO purchase lots (uncosted remainder at ₱0 if no lots)
   * - Writes a non-editable consumable expense line (delete reverses stock)
   */
  async useConsumable(
    rawProjectId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ProjectExpenseLineDTO> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const project = await this.requireMutableProject(projectId);
    const input = useConsumableOnProjectSchema.parse(rawInput);

    return withTransaction(async (tx) => {
      const item = await this.consumables.findByIdForUpdate(
        input.consumableId,
        tx
      );
      if (!item) throw new NotFoundError("Consumable", input.consumableId);

      if (item.currentQty < input.quantity) {
        throw new BadRequestError(
          `Insufficient stock. Available: ${item.currentQty} ${item.unit}.`
        );
      }
      const freeQty = Math.max(0, item.currentQty - (item.reservedQty ?? 0));
      if (input.quantity > freeQty) {
        throw new BadRequestError(
          `Only ${freeQty} ${item.unit} available (${item.reservedQty ?? 0} reserved for approved supply requests).`
        );
      }

      let remaining = input.quantity;
      let totalCost = 0;
      const lotAllocations: NonNullable<
        ProjectExpenseMetadata["lotAllocations"]
      > = [];

      if (input.purchaseLotId) {
        const lot = await this.lots.findById(input.purchaseLotId, tx);
        if (!lot) throw new NotFoundError("Purchase lot", input.purchaseLotId);
        if (lot.consumableId !== item.id) {
          throw new BadRequestError(
            "Selected purchase lot does not belong to this consumable."
          );
        }
        if (lot.quantityRemaining < input.quantity) {
          throw new BadRequestError(
            `Selected lot only has ${lot.quantityRemaining} ${item.unit} remaining.`
          );
        }

        const unit = Number(lot.unitCost);
        const lineTotal = unit * input.quantity;
        totalCost = lineTotal;
        lotAllocations.push({
          lotId: lot.id,
          lotCode: lot.lotCode,
          quantity: input.quantity,
          unitCost: unit.toFixed(2),
          total: lineTotal.toFixed(2),
        });

        await this.lots.updateRemaining(
          lot.id,
          lot.quantityRemaining - input.quantity,
          tx
        );
        remaining = 0;
      } else {
        const availableLots = await this.lots.listAvailableForConsumableFifo(
          item.id,
          tx
        );

        for (const lot of availableLots) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, lot.quantityRemaining);
          if (take <= 0) continue;

          const unit = Number(lot.unitCost);
          const lineTotal = unit * take;
          totalCost += lineTotal;
          lotAllocations.push({
            lotId: lot.id,
            lotCode: lot.lotCode,
            quantity: take,
            unitCost: unit.toFixed(2),
            total: lineTotal.toFixed(2),
          });

          await this.lots.updateRemaining(
            lot.id,
            lot.quantityRemaining - take,
            tx
          );
          remaining -= take;
        }

        if (remaining > 0) {
          lotAllocations.push({
            lotId: null,
            lotCode: null,
            quantity: remaining,
            unitCost: "0.00",
            total: "0.00",
            uncosted: true,
          });
        }
      }

      const averageUnit =
        input.quantity > 0
          ? (totalCost / input.quantity).toFixed(2)
          : "0.00";
      const amount = totalCost.toFixed(2);

      const description =
        input.description?.trim() ||
        `${item.name} (${item.itemCode}) × ${input.quantity} ${item.unit}`;

      await this.consumables.update(
        item.id,
        {
          currentQty: item.currentQty - input.quantity,
        },
        tx
      );

      const movementRows = await this.movements.record(
        {
          consumableId: item.id,
          direction: "out",
          reason: "issue",
          actor,
          projectId,
          notes:
            input.notes ??
            `Charged to ${project.projectCode} — ${project.name}`,
          lines:
            lotAllocations.length > 0
              ? expenseAllocationsToMovementLines(lotAllocations)
              : [{ qty: input.quantity }],
        },
        tx
      );

      const movementIds = movementRows.map((r) => r.id);
      const metadata: ProjectExpenseMetadata = {
        lotAllocations,
        consumableCode: item.itemCode,
        consumableName: item.name,
        consumableUnit: item.unit,
        stockMovementId: movementIds[0],
        stockMovementIds: movementIds,
      };

      const row = await this.expenses.create(
        {
          projectId,
          lineType: "consumable",
          category: "miscellaneous",
          description,
          amount,
          quantity: String(input.quantity),
          unitCost: averageUnit,
          consumableId: item.id,
          assetId: null,
          incurredOn: input.incurredOn ?? todayDateString(),
          notes: input.notes ?? null,
          metadata,
          recordedByUserId: actor.userId,
          recordedByName: actor.displayName,
        },
        tx
      );

      return toDTO(row);
    });
  }

  async update(
    rawProjectId: string,
    rawExpenseId: string,
    rawInput: unknown
  ): Promise<ProjectExpenseLineDTO> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const expenseId = expenseIdSchema.parse(rawExpenseId);
    await this.requireMutableProject(projectId);

    const existing = await this.requireExpenseForProject(projectId, expenseId);

    if (
      existing.lineType !== "miscellaneous" &&
      existing.lineType !== "adjustment" &&
      existing.lineType !== "material"
    ) {
      throw new ConflictError(
        "Inventory and write-off lines cannot be edited. Delete/reverse where supported, or record an adjustment."
      );
    }

    const input = updateProjectExpenseSchema.parse(rawInput);
    const nextLineType = input.lineType ?? existing.lineType;
    if (
      nextLineType !== "miscellaneous" &&
      nextLineType !== "adjustment" &&
      nextLineType !== "material"
    ) {
      throw new ConflictError("Invalid line type for manual expenses.");
    }

    if (
      ((input.lineType === "miscellaneous" ||
        input.lineType === "material" ||
        (!input.lineType &&
          (existing.lineType === "miscellaneous" ||
            existing.lineType === "material"))) &&
        input.amount !== undefined &&
        Number(input.amount) < 0)
    ) {
      throw new ConflictError(
        "Spend lines must be positive. Use an adjustment line for credits."
      );
    }

    const category =
      nextLineType === "adjustment"
        ? "adjustment"
        : nextLineType === "material"
          ? "miscellaneous"
          : input.category !== undefined
            ? input.category
            : existing.category;

    if (category === "other") {
      const label =
        input.categoryLabel !== undefined
          ? input.categoryLabel?.trim() || null
          : ((existing.metadata ?? {}) as ProjectExpenseMetadata).customCategory ??
            null;
      if (!label) {
        throw new BadRequestError(
          "Enter a custom category when Other is selected."
        );
      }
    }

    const existingMeta = (existing.metadata ?? {}) as ProjectExpenseMetadata;
    let nextMetadata: ProjectExpenseMetadata | undefined;
    if (input.categoryLabel !== undefined || input.category !== undefined) {
      nextMetadata = { ...existingMeta };
      if (category === "other") {
        const label =
          input.categoryLabel?.trim() ||
          existingMeta.customCategory ||
          undefined;
        if (label) nextMetadata.customCategory = label;
      } else {
        delete nextMetadata.customCategory;
      }
    }

    const updated = await this.expenses.update(existing.id, {
      ...(input.lineType !== undefined ? { lineType: input.lineType } : {}),
      category,
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.unitCost !== undefined ? { unitCost: input.unitCost } : {}),
      ...(input.incurredOn !== undefined
        ? { incurredOn: input.incurredOn }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(nextMetadata !== undefined ? { metadata: nextMetadata } : {}),
    });

    if (!updated) throw new NotFoundError("Project expense", existing.id);
    return toDTO(updated);
  }

  async delete(
    rawProjectId: string,
    rawExpenseId: string,
    actor: ActorContext
  ): Promise<void> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const expenseId = expenseIdSchema.parse(rawExpenseId);
    await this.requireMutableProject(projectId);

    // Prefer list-scoped lookup — same source as GET /expenses — then delete by
    // the row's own id. Avoids by-id misses that still appear in the project ledger.
    const listed = await this.expenses.listByProject(projectId);
    const existing =
      listed.find((row) => row.id === expenseId) ??
      listed.find((row) => row.id.toLowerCase() === expenseId.toLowerCase()) ??
      null;

    if (!existing) {
      return;
    }

    if (
      existing.lineType === "miscellaneous" ||
      existing.lineType === "adjustment" ||
      existing.lineType === "material"
    ) {
      await this.expenses.delete(existing.id);
      return;
    }

    if (existing.lineType === "consumable") {
      await this.reverseConsumableExpense(existing, actor);
      return;
    }

    throw new ConflictError(
      "Write-off expense lines cannot be deleted. Use an adjustment credit if the charge was incorrect."
    );
  }

  private async reverseConsumableExpense(
    existing: ProjectExpenseLineRow,
    actor: ActorContext
  ): Promise<void> {
    const qty = Math.round(Number(existing.quantity ?? 0));
    if (!existing.consumableId || !Number.isFinite(qty) || qty <= 0) {
      await this.expenses.delete(existing.id);
      return;
    }

    await withTransaction(async (tx) => {
      const item = await this.consumables.findByIdForUpdate(
        existing.consumableId!,
        tx
      );
      if (!item) {
        // Item removed — still remove expense so ledger matches project
        await this.expenses.delete(existing.id, tx);
        return;
      }

      const metadata = (existing.metadata ?? {}) as ProjectExpenseMetadata;
      const linkedIds =
        metadata.stockMovementIds ??
        (metadata.stockMovementId ? [metadata.stockMovementId] : []);

      // Issue History undo already restocked — drop the charge without double-restock.
      let alreadyUndone = false;
      for (const movementId of linkedIds) {
        const mov = await this.movementRepo.findById(movementId, tx);
        if (!mov) continue;
        if (
          isVoidedNotes(mov.notes) ||
          (await this.movementRepo.findReversalOf(movementId, tx))
        ) {
          alreadyUndone = true;
          break;
        }
      }
      if (alreadyUndone) {
        await this.expenses.delete(existing.id, tx);
        return;
      }

      const allocations = metadata.lotAllocations ?? [];

      for (const alloc of allocations) {
        if (!alloc.lotId || alloc.quantity <= 0) continue;
        const lot = await this.lots.findById(alloc.lotId, tx);
        if (!lot) continue;
        await this.lots.updateRemaining(
          lot.id,
          lot.quantityRemaining + alloc.quantity,
          tx
        );
      }

      const reverseMarkers = linkedIds.map((id) => reversesMarker(id)).join(" ");
      const returnNote = [
        reverseMarkers || null,
        "Project material line removed — stock returned to inventory",
      ]
        .filter(Boolean)
        .join(" ");

      await this.consumables.update(
        item.id,
        {
          currentQty: item.currentQty + qty,
        },
        tx
      );

      // Issue-history / stock_movements ledger must mirror the stock return.
      await this.movements.record(
        {
          consumableId: item.id,
          direction: "in",
          reason: "restock",
          actor,
          projectId: existing.projectId,
          notes: returnNote,
          lines:
            allocations.length > 0
              ? expenseAllocationsToMovementLines(allocations)
              : [{ qty }],
        },
        tx
      );

      for (const movementId of linkedIds) {
        const mov = await this.movementRepo.findById(movementId, tx);
        if (!mov || isVoidedNotes(mov.notes)) continue;
        const nextNotes = [
          mov.notes?.trim(),
          `${voidedMarker()} Project material line removed`,
        ]
          .filter(Boolean)
          .join(" · ");
        await this.movementRepo.updateNotes(movementId, nextNotes, tx);
      }

      await this.expenses.delete(existing.id, tx);
    });
  }
}
