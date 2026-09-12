import {
  type ConsumableRow,
  auditLogs,
  stockMovements,
  consumableRequestLines,
} from "@/server/db/schema";
import { getDb } from "@/server/db";
import { eq } from "drizzle-orm";
import {
  generateOperationalCode,
  todayDateString,
} from "@/server/shared/codes";
import type { ActorContext } from "@/server/shared/auth";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/server/shared/errors";
import { withTransaction, type DbSession } from "@/server/db/transaction";
import { parseScanPayload } from "@/server/shared/qr";
import {
  PurchaseLotService,
  type LotCostAllocation,
} from "@/server/modules/purchase-lots/purchase-lot.service";
import type { PurchaseLotDTO } from "@/server/modules/purchase-lots/purchase-lot.types";
import { scanReleaseLotSchema } from "@/server/modules/purchase-lots/purchase-lot.validation";
import { CategoryRepository } from "@/server/modules/categories/category.repository";
import { DepartmentRepository } from "@/server/modules/departments/department.repository";
import { ProjectRepository } from "@/server/modules/projects/project.repository";
import { ProjectExpenseRepository } from "@/server/modules/projects/project-expense.repository";
import type { ProjectExpenseMetadata } from "@/server/db/schema";
import {
  StockMovementService,
  allocationsToMovementLines,
} from "@/server/modules/stock-movements";

import { ConsumableRepository } from "./consumable.repository";
import type { ConsumableDTO } from "./consumable.types";
import {
  consumableIdSchema,
  createConsumableSchema,
  listConsumablesQuerySchema,
  restockSchema,
  stockAdjustSchema,
  issueConsumableSchema,
  updateConsumableSchema,
} from "./consumable.validation";

function getStockSeverity(
  currentQty: number,
  minThreshold: number
): "healthy" | "low" | "critical" {
  if (currentQty <= minThreshold) return "critical";
  if (currentQty <= minThreshold * 1.2) return "low";
  return "healthy";
}

function availableQty(row: { currentQty: number; reservedQty?: number | null }): number {
  return Math.max(0, row.currentQty - (row.reservedQty ?? 0));
}

function toDTO(row: ConsumableRow): ConsumableDTO {
  const reservedQty = row.reservedQty ?? 0;
  return {
    id: row.id,
    itemCode: row.itemCode,
    name: row.name,
    category: row.category,
    unit: row.unit,
    currentQty: row.currentQty,
    reservedQty,
    availableQty: availableQty({ currentQty: row.currentQty, reservedQty }),
    minThreshold: row.minThreshold,
    location: row.location,
    supplier: row.supplier ?? undefined,
    lastRestocked: row.lastRestocked
      ? row.lastRestocked instanceof Date
        ? row.lastRestocked.toISOString().slice(0, 10)
        : String(row.lastRestocked).slice(0, 10)
      : "—",
    notes: row.notes ?? undefined,
    isSandbox: row.isSandbox,
    // Stock ledger is stock_movements (Issue History). Do not grow JSONB history.
    history: [],
  };
}

export class ConsumableService {
  constructor(
    private readonly repo = new ConsumableRepository(),
    private readonly purchaseLots = new PurchaseLotService(),
    private readonly taxonomy = new CategoryRepository(),
    private readonly departments = new DepartmentRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly projectExpenses = new ProjectExpenseRepository(),
    private readonly movements = new StockMovementService()
  ) {}

  private async resolveIssueDestination(
    departmentId: string | undefined,
    projectId: string | undefined,
    tx?: DbSession
  ): Promise<{
    departmentId: string | null;
    projectId: string | null;
    projectCode?: string;
    projectName?: string;
    departmentCode?: string;
    departmentName?: string;
  }> {
    if (departmentId && projectId) {
      throw new BadRequestError(
        "Specify exactly one destination: department or project."
      );
    }
    if (projectId) {
      const project = await this.projects.findById(projectId, tx);
      if (!project) throw new NotFoundError("Project", projectId);
      if (project.status === "completed") {
        throw new ConflictError(
          "Completed projects are read-only. Issue materials to an active project instead."
        );
      }
      return {
        departmentId: null,
        projectId,
        projectCode: project.projectCode,
        projectName: project.name,
      };
    }
    if (departmentId) {
      const dept = await this.departments.findById(departmentId, tx);
      if (!dept) throw new NotFoundError("Department", departmentId);
      return {
        departmentId,
        projectId: null,
        departmentCode: dept.code,
        departmentName: dept.name,
      };
    }
    throw new BadRequestError(
      "Specify exactly one destination: department or project."
    );
  }

  private rejectUncosted(allocations: LotCostAllocation[], itemCode: string) {
    const uncosted = allocations.find((a) => a.uncosted);
    if (uncosted) {
      throw new BadRequestError(
        `Not on hand for ${itemCode}: not enough costed lot quantity (short ${uncosted.quantity}). Restock or file a purchase order first.`
      );
    }
  }

  private async resolveConsumableCategoryName(rawName: string): Promise<string> {
    const found = await this.taxonomy.findByTypeAndName("consumable", rawName);
    if (!found) {
      throw new BadRequestError(
        `Unknown consumable category “${rawName}”. Add it under Settings → Categories first.`
      );
    }
    return found.name;
  }

  async list(rawQuery: unknown): Promise<import("@/types/filters").PaginatedResponse<ConsumableDTO>> {
    const filters = listConsumablesQuerySchema.parse(rawQuery ?? {});
    const result = await this.repo.list({
      category: filters.category,
      search: filters.search,
      stockLevel: filters.stockLevel === "critical" ? "critical" : undefined,
      page: filters.page,
      limit: filters.limit,
      includeSandbox: filters.includeSandbox === true,
    });

    let dtos = result.data.map(toDTO);

    if (filters.stockLevel && filters.stockLevel !== "all") {
      dtos = dtos.filter((row) => {
        const severity = getStockSeverity(row.currentQty, row.minThreshold);
        if (filters.stockLevel === "healthy") return severity === "healthy";
        if (filters.stockLevel === "low") return severity === "low";
        if (filters.stockLevel === "critical") return severity === "critical";
        return true;
      });
    }

    return {
      ...result,
      data: dtos,
    };
  }

  async getById(rawId: string): Promise<ConsumableDTO> {
    const id = consumableIdSchema.parse(rawId);
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundError("Consumable", id);
    return toDTO(row);
  }

  async create(rawInput: unknown, actor: ActorContext): Promise<ConsumableDTO> {
    const input = createConsumableSchema.parse(rawInput);
    const itemCode = input.itemCode?.trim() || generateOperationalCode("CON");
    const categoryName = await this.resolveConsumableCategoryName(input.category);

    const exists = await this.repo.findByCode(itemCode);
    if (exists) {
      throw new ConflictError(`Item code ${itemCode} already exists.`);
    }

    const baseRow = {
      itemCode,
      name: input.name,
      category: categoryName,
      unit: input.unit,
      minThreshold: input.minThreshold,
      location: input.location,
      supplier: input.supplier ?? null,
      notes: input.notes ?? null,
      isSandbox: input.isSandbox ?? false,
    };

    if (input.currentQty <= 0) {
      const row = await this.repo.create({
        ...baseRow,
        currentQty: 0,
        lastRestocked: null,
        history: [],
      });
      return toDTO(row);
    }

    return withTransaction(async (tx) => {
      const row = await this.repo.create(
        {
          ...baseRow,
          currentQty: input.currentQty,
          lastRestocked: new Date(),
          history: [],
        },
        tx
      );

      const lot = await this.purchaseLots.recordLot(
        {
          itemType: "consumable",
          consumableId: row.id,
          itemCode: row.itemCode,
          itemName: row.name,
          supplierId: input.supplierId ?? null,
          supplierName: input.supplier ?? null,
          quantity: input.currentQty,
          unitCost:
            typeof input.unitCost === "number"
              ? input.unitCost.toFixed(2)
              : Number(input.unitCost).toFixed(2),
          purchasedOn: todayDateString(),
          reference: "Initial stock",
          notes: input.notes ?? "Opening balance on item create",
          recordedByUserId: actor.userId,
          recordedByName: actor.displayName,
        },
        tx
      );

      let updated = row;
      if (lot.supplierName) {
        const next = await this.repo.update(
          row.id,
          { supplier: lot.supplierName },
          tx
        );
        if (!next) throw new NotFoundError("Consumable", row.id);
        updated = next;
      }

      await this.movements.record(
        {
          consumableId: row.id,
          direction: "in",
          reason: "restock",
          actor,
          notes: input.notes ?? "Initial stock",
          lines: [
            {
              qty: input.currentQty,
              purchaseLotId: lot.id,
              lotCode: lot.lotCode,
              unitCost: lot.unitCost,
              lineTotal: lot.totalCost,
            },
          ],
        },
        tx
      );

      return toDTO(updated);
    });
  }

  async update(rawId: string, rawInput: unknown): Promise<ConsumableDTO> {
    const id = consumableIdSchema.parse(rawId);
    const input = updateConsumableSchema.parse(rawInput);
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Consumable", id);

    let categoryName: string | undefined;
    if (input.category !== undefined) {
      categoryName = await this.resolveConsumableCategoryName(input.category);
    }

    const updated = await this.repo.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(categoryName !== undefined ? { category: categoryName } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.minThreshold !== undefined
        ? { minThreshold: input.minThreshold }
        : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.supplier !== undefined ? { supplier: input.supplier } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.isSandbox !== undefined ? { isSandbox: input.isSandbox } : {}),
    });
    if (!updated) throw new NotFoundError("Consumable", id);
    return toDTO(updated);
  }

  async restock(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ConsumableDTO> {
    const id = consumableIdSchema.parse(rawId);
    const input = restockSchema.parse(rawInput);

    return withTransaction(async (tx) => {
      const existing = await this.repo.findByIdForUpdate(id, tx);
      if (!existing) throw new NotFoundError("Consumable", id);

      const purchasedOn = input.purchasedOn ?? todayDateString();
      const lot = await this.purchaseLots.recordLot(
        {
          itemType: "consumable",
          consumableId: existing.id,
          itemCode: existing.itemCode,
          itemName: existing.name,
          supplierId: input.supplierId ?? null,
          quantity: input.quantity,
          unitCost: input.unitCost,
          purchasedOn,
          reference: input.reason ?? null,
          notes: input.notes ?? null,
          recordedByUserId: actor.userId,
          recordedByName: actor.displayName,
        },
        tx
      );

      const updated = await this.repo.update(
        id,
        {
          currentQty: existing.currentQty + input.quantity,
          lastRestocked: new Date(),
          ...(lot.supplierName ? { supplier: lot.supplierName } : {}),
        },
        tx
      );
      if (!updated) throw new NotFoundError("Consumable", id);

      await this.movements.record(
        {
          consumableId: existing.id,
          direction: "in",
          reason: "restock",
          actor,
          notes: input.notes ?? input.reason ?? null,
          lines: [
            {
              qty: input.quantity,
              purchaseLotId: lot.id,
              lotCode: lot.lotCode,
              unitCost: lot.unitCost,
              lineTotal: lot.totalCost,
            },
          ],
        },
        tx
      );

      return toDTO(updated);
    });
  }

  async checkout(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ConsumableDTO> {
    return this.issue(rawId, rawInput, actor);
  }

  /**
   * QR scan release against a *specific* supplier purchase lot.
   * Quantity is entered after scan; cost/supplier are frozen from the lot row.
   */
  async releaseFromLot(
    rawInput: unknown,
    actor: ActorContext
  ): Promise<{
    consumable: ConsumableDTO;
    lot: PurchaseLotDTO;
    allocation: LotCostAllocation;
  }> {
    const input = scanReleaseLotSchema.parse(rawInput);
    const parsed = parseScanPayload(input.code);
    if (!parsed.code) {
      throw new BadRequestError("Lot code is required.");
    }

    return withTransaction(async (tx) => {
      // Resolve lot without consuming yet — then lock consumable stock first
      // so we never drain a lot when the stock item is short.
      const preview = await this.purchaseLots.getByCode(parsed.code);
      if (preview.itemType !== "consumable") {
        throw new BadRequestError(
          "Only consumable purchase lots support quantity release via scan."
        );
      }
      if (!preview.consumableId) {
        throw new BadRequestError(
          "This purchase lot is not linked to a consumable item."
        );
      }
      if (preview.quantityRemaining < input.quantity) {
        throw new BadRequestError(
          `Insufficient remaining in lot ${preview.lotCode}. Available: ${preview.quantityRemaining}.`
        );
      }

      const existing = await this.repo.findByIdForUpdate(
        preview.consumableId,
        tx
      );
      if (!existing) {
        throw new NotFoundError("Consumable", preview.consumableId);
      }

      if (existing.currentQty < input.quantity) {
        throw new BadRequestError(
          `Not on hand for ${existing.itemCode}. Available: ${existing.currentQty} ${existing.unit}. Restock or file a purchase order first.`
        );
      }
      const freeQty = availableQty(existing);
      if (input.quantity > freeQty) {
        throw new BadRequestError(
          `Only ${freeQty} ${existing.unit} available to issue for ${existing.itemCode} (${existing.reservedQty ?? 0} reserved for approved supply requests).`
        );
      }

      const dest = await this.resolveIssueDestination(
        input.departmentId,
        input.projectId,
        tx
      );

      const { lot, allocation } = await this.purchaseLots.consumeFromLot(
        preview.lotCode,
        input.quantity,
        tx
      );

      const updated = await this.repo.update(
        existing.id,
        {
          currentQty: existing.currentQty - input.quantity,
        },
        tx
      );
      if (!updated) throw new NotFoundError("Consumable", existing.id);

      await this.movements.record(
        {
          consumableId: existing.id,
          direction: "out",
          reason: "issue",
          actor,
          departmentId: dest.departmentId,
          projectId: dest.projectId,
          notes: input.notes ?? input.reason ?? null,
          lines: allocationsToMovementLines([allocation]),
        },
        tx
      );

      return {
        consumable: toDTO(updated),
        lot,
        allocation,
      };
    });
  }

  async adjust(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ConsumableDTO> {
    const id = consumableIdSchema.parse(rawId);
    const input = stockAdjustSchema.parse(rawInput);

    return withTransaction(async (tx) => {
      const existing = await this.repo.findByIdForUpdate(id, tx);
      if (!existing) throw new NotFoundError("Consumable", id);

      const next = existing.currentQty + input.quantityChange;
      if (next < 0) {
        throw new BadRequestError(
          `Cannot deduct ${Math.abs(input.quantityChange)} ${existing.unit}. Only ${existing.currentQty} ${existing.unit} available in stock.`
        );
      }
      const reservedQty = existing.reservedQty ?? 0;
      if (next < reservedQty) {
        throw new BadRequestError(
          `Cannot reduce stock below ${reservedQty} ${existing.unit} reserved for approved supply requests.`
        );
      }

      const lotAllocations: LotCostAllocation[] = [];

      if (input.quantityChange < 0) {
        if (!input.allocations || input.allocations.length === 0 || input.useFifo) {
          const need = Math.abs(input.quantityChange);
          const fifoAllocs = await this.purchaseLots.consumeFifo(
            existing.id,
            need,
            tx
          );
          lotAllocations.push(...fifoAllocs);
        } else {
          for (const alloc of input.allocations ?? []) {
            const result = alloc.lotId
              ? await this.purchaseLots.consumeFromLotId(
                  alloc.lotId,
                  alloc.quantity,
                  tx,
                  existing.id
                )
              : await this.purchaseLots.consumeFromLot(
                  alloc.lotCode!,
                  alloc.quantity,
                  tx,
                  existing.id
                );
            lotAllocations.push(result.allocation);
          }
        }
      } else if (input.attachLotId || input.attachLotCode) {
        const result = await this.purchaseLots.addToLot(
          { lotId: input.attachLotId, lotCode: input.attachLotCode },
          input.quantityChange,
          tx,
          existing.id
        );
        lotAllocations.push(result.allocation);
      } else {
        // Correction lot (found stock / uncosted correction)
        const lot = await this.purchaseLots.recordLot(
          {
            itemType: "consumable",
            consumableId: existing.id,
            itemCode: existing.itemCode,
            itemName: existing.name,
            supplierId: input.supplierId ?? null,
            quantity: input.quantityChange,
            unitCost: input.unitCost ?? "0.00",
            purchasedOn: todayDateString(),
            reference: input.reason,
            notes: input.notes ?? "Stock correction lot",
            recordedByUserId: actor.userId,
            recordedByName: actor.displayName,
          },
          tx
        );
        lotAllocations.push({
          lotId: lot.id,
          lotCode: lot.lotCode,
          quantity: input.quantityChange,
          unitCost: lot.unitCost,
          total: lot.totalCost,
          supplierId: lot.supplierId,
          supplierName: lot.supplierName,
        });
      }

      const updated = await this.repo.update(
        id,
        { currentQty: next },
        tx
      );
      if (!updated) throw new NotFoundError("Consumable", id);

      await this.movements.record(
        {
          consumableId: existing.id,
          direction: input.quantityChange > 0 ? "in" : "out",
          reason: "adjust",
          actor,
          notes: input.notes ?? input.reason,
          lines: allocationsToMovementLines(lotAllocations),
        },
        tx
      );

      return toDTO(updated);
    });
  }

  /**
   * Admin walk-up issue: dest required, stock deducted immediately.
   * Same engine as checkout / lot scan — never a pending request.
   * When destination is a project, also writes a consumable expense line
   * so the charge appears on the project ledger.
   */
  async issue(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ConsumableDTO> {
    const id = consumableIdSchema.parse(rawId);
    const input = issueConsumableSchema.parse(rawInput);

    return withTransaction(async (tx) => {
      const existing = await this.repo.findByIdForUpdate(id, tx);
      if (!existing) throw new NotFoundError("Consumable", id);

      if (existing.currentQty < input.quantity) {
        throw new BadRequestError(
          `Not on hand for ${existing.itemCode}. Available: ${existing.currentQty} ${existing.unit}. Restock first.`
        );
      }
      const freeQty = availableQty(existing);
      if (input.quantity > freeQty) {
        throw new BadRequestError(
          `Only ${freeQty} ${existing.unit} available to issue for ${existing.itemCode} (${existing.reservedQty ?? 0} reserved for approved supply requests).`
        );
      }

      const dest = await this.resolveIssueDestination(
        input.departmentId,
        input.projectId,
        tx
      );

      if (!input.lotId && !input.lotCode) {
        throw new BadRequestError("Select a purchase lot to issue from.");
      }
      const result = input.lotId
        ? await this.purchaseLots.consumeFromLotId(
            input.lotId,
            input.quantity,
            tx,
            existing.id
          )
        : await this.purchaseLots.consumeFromLot(
            input.lotCode!,
            input.quantity,
            tx,
            existing.id
          );
      const allocations: LotCostAllocation[] = [result.allocation];

      const totalCost = allocations.reduce((sum, a) => sum + Number(a.total), 0);
      const destNote = [
        input.reason,
        dest.projectCode
          ? `Issued to project ${dest.projectCode}${dest.projectName ? ` (${dest.projectName})` : ""}`
          : dest.departmentCode
            ? `Issued to department ${dest.departmentCode}${dest.departmentName ? ` (${dest.departmentName})` : ""}`
            : null,
        input.requestedByName ? `Requested by: ${input.requestedByName}` : null,
        input.receivedBy ? `Received by: ${input.receivedBy}` : null,
      ]
        .filter(Boolean)
        .join(". ");

      const updated = await this.repo.update(
        id,
        {
          currentQty: existing.currentQty - input.quantity,
        },
        tx
      );
      if (!updated) throw new NotFoundError("Consumable", id);

      const movementRows = await this.movements.record(
        {
          consumableId: existing.id,
          direction: "out",
          reason: "issue",
          actor,
          departmentId: dest.departmentId,
          projectId: dest.projectId,
          notes: input.notes ?? destNote ?? null,
          lines: allocationsToMovementLines(allocations),
        },
        tx
      );

      // Mirror project "Use inventory material" so the charge shows on the project.
      if (dest.projectId) {
        const averageUnit =
          input.quantity > 0
            ? (totalCost / input.quantity).toFixed(2)
            : "0.00";
        const movementIds = movementRows.map((r) => r.id);
        const metadata: ProjectExpenseMetadata = {
          lotAllocations: allocations.map((a) => ({
            lotId: a.lotId,
            lotCode: a.lotCode,
            quantity: a.quantity,
            unitCost: a.unitCost,
            total: a.total,
            uncosted: a.uncosted,
          })),
          consumableCode: existing.itemCode,
          consumableName: existing.name,
          consumableUnit: existing.unit,
          stockMovementId: movementIds[0],
          stockMovementIds: movementIds,
        };

        await this.projectExpenses.create(
          {
            projectId: dest.projectId,
            lineType: "consumable",
            category: "miscellaneous",
            description: `${existing.name} (${existing.itemCode}) × ${input.quantity} ${existing.unit}`,
            amount: totalCost.toFixed(2),
            quantity: String(input.quantity),
            unitCost: averageUnit,
            consumableId: existing.id,
            assetId: null,
            incurredOn: todayDateString(),
            notes: input.notes ?? destNote ?? null,
            metadata,
            recordedByUserId: actor.userId,
            recordedByName: actor.displayName,
          },
          tx
        );
      }

      return toDTO(updated);
    });
  }

  async delete(rawId: string, actor: ActorContext): Promise<void> {
    const id = consumableIdSchema.parse(rawId);
    return withTransaction(async (session) => {
      const db = session ?? getDb();
      const existing = await this.repo.findByIdForUpdate(id, session);
      if (!existing) {
        throw new NotFoundError("Consumable", id);
      }

      await db.insert(auditLogs).values({
        entityType: "consumable",
        entityId: existing.itemCode,
        action: "consumable_deleted",
        actorName: actor.displayName,
        actorUserId: actor.userId,
        notes: `Deleted consumable inventory item "${existing.name}" (${existing.itemCode}).`,
        metadata: {
          id: existing.id,
          itemCode: existing.itemCode,
          name: existing.name,
          category: existing.category,
          currentQty: existing.currentQty,
        },
      });

      await db
        .delete(stockMovements)
        .where(eq(stockMovements.consumableId, id));

      await db
        .delete(consumableRequestLines)
        .where(eq(consumableRequestLines.consumableId, id));

      const deleted = await this.repo.delete(id, session);
      if (!deleted) {
        throw new NotFoundError("Consumable", id);
      }
    });
  }
}
