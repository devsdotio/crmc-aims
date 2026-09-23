import {
  type ConsumableRow,
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
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";

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
import {
  DEFAULT_CONSUMABLE_CLASSIFICATION,
  isConsumableClassification,
} from "@/lib/consumable-classification";

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
    classification: isConsumableClassification(row.classification)
      ? row.classification
      : DEFAULT_CONSUMABLE_CLASSIFICATION,
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
  private readonly auditLogs = new AuditLogService();

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

  async list(
    rawQuery: unknown,
    tenantId?: string,
    actor?: ActorContext
  ): Promise<import("@/types/filters").PaginatedResponse<ConsumableDTO>> {
    const filters = listConsumablesQuerySchema.parse(rawQuery ?? {});

    // Borrowers: warehouse list only via catalog=1 (request wizards). Default = empty
    // (department-issued history lives on stock-movements, session-scoped).
    if (actor?.role === "borrower" && !filters.catalog) {
      const limit = filters.limit ?? 50;
      const page = filters.page ?? 1;
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const result = await this.repo.list({
      category: filters.category,
      classification: filters.classification,
      search: filters.search,
      stockLevel: filters.stockLevel === "critical" ? "critical" : undefined,
      page: filters.page,
      limit: filters.limit,
      includeSandbox: filters.includeSandbox === true,
    }, undefined, tenantId);

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

    if (actor?.role === "borrower" && filters.catalog) {
      // Narrow catalog: no movement history / supplier for request pickers.
      dtos = dtos.map((row) => ({
        ...row,
        history: [],
        supplier: undefined,
      }));
    }

    return {
      ...result,
      data: dtos,
    };
  }

  async getById(rawId: string, tenantId?: string): Promise<ConsumableDTO> {
    const id = consumableIdSchema.parse(rawId);
    const row = await this.repo.findById(id, undefined, tenantId);
    if (!row) throw new NotFoundError("Consumable", id);
    return toDTO(row);
  }

  async create(rawInput: unknown, actor: ActorContext): Promise<ConsumableDTO> {
    const input = createConsumableSchema.parse(rawInput);
    const itemCode = input.itemCode?.trim() || generateOperationalCode("CON");
    const categoryName = await this.resolveConsumableCategoryName(input.category);

    const exists = await this.repo.findByCode(itemCode, undefined, actor.tenantId);
    if (exists) {
      throw new ConflictError(`Item code ${itemCode} already exists.`);
    }

    const baseRow = {
      tenantId: actor.tenantId,
      itemCode,
      name: input.name,
      category: categoryName,
      classification: input.classification,
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
      await this.auditLogs.log({
        entityType: AUDIT_ENTITY.consumable,
        entityId: row.itemCode,
        action: "created",
        actorName: actor.displayName,
        actorUserId: actor.userId,
        notes: `Created consumable ${row.itemCode} (${row.name}).`,
        metadata: {
          itemCode: row.itemCode,
          category: row.category,
          openingQty: 0,
        },
      });
      return toDTO(row);
    }

    // Opening qty > 0 must create a costed lot. Persist the SKU at qty 0 first so a
    // failed lot never leaves on-hand stock that cannot be issued.
    const openingUnitCost =
      typeof input.unitCost === "number"
        ? input.unitCost
        : Number(input.unitCost);
    if (!Number.isFinite(openingUnitCost) || openingUnitCost <= 0) {
      throw new BadRequestError(
        "Unit cost must be greater than zero when adding initial stock."
      );
    }

    return withTransaction(async (tx) => {
      const row = await this.repo.create(
        {
          ...baseRow,
          currentQty: 0,
          lastRestocked: null,
          history: [],
        },
        tx
      );

      const lot = await this.recordOpeningLot(
        {
          row,
          quantity: input.currentQty,
          unitCost: openingUnitCost.toFixed(2),
          supplierId: input.supplierId ?? null,
          supplierName: input.supplier ?? null,
          notes: input.notes ?? "Opening balance on item create",
          actor,
        },
        tx
      );

      const next = await this.repo.update(
        row.id,
        {
          currentQty: input.currentQty,
          lastRestocked: new Date(),
          ...(lot.supplierName ? { supplier: lot.supplierName } : {}),
        },
        tx,
        actor.tenantId
      );
      if (!next) throw new NotFoundError("Consumable", row.id);

      await this.movements.record(
        {
          consumableId: row.id,
          direction: "in",
          reason: "restock",
          actor,
          notes: input.notes ?? "Opening balance",
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

      await this.auditLogs.log(
        {
          entityType: AUDIT_ENTITY.consumable,
          entityId: next.itemCode,
          action: "created",
          actorName: actor.displayName,
          actorUserId: actor.userId,
          notes: `Created consumable ${next.itemCode} with opening stock (${input.currentQty}).`,
          metadata: {
            itemCode: next.itemCode,
            category: next.category,
            openingQty: input.currentQty,
            lotCode: lot.lotCode,
            lotId: lot.id,
          },
        },
        tx
      );

      return toDTO(next);
    });
  }

  /**
   * Costed opening-balance lot for on-hand qty that has no purchase lot yet.
   * Used on manual create and to repair older items registered with stock only.
   */
  private async recordOpeningLot(
    input: {
      row: ConsumableRow;
      quantity: number;
      unitCost: string;
      supplierId?: string | null;
      supplierName?: string | null;
      notes?: string | null;
      actor: ActorContext;
    },
    tx?: DbSession
  ): Promise<PurchaseLotDTO> {
    const lot = await this.purchaseLots.recordLot(
      {
        tenantId: input.actor.tenantId,
        itemType: "consumable",
        consumableId: input.row.id,
        itemCode: input.row.itemCode,
        itemName: input.row.name,
        supplierId: input.supplierId ?? null,
        supplierName: input.supplierName ?? input.row.supplier ?? null,
        quantity: input.quantity,
        unitCost: input.unitCost,
        purchasedOn: todayDateString(),
        reference: "Initial stock",
        purpose: "Opening balance",
        notes: input.notes ?? "Opening balance on item create",
        recordedByUserId: input.actor.userId,
        recordedByName: input.actor.displayName,
        status: "delivered",
      },
      tx
    );

    if (!lot?.id) {
      throw new BadRequestError(
        "Failed to record opening-balance lot for initial stock."
      );
    }

    return lot;
  }

  /**
   * If the item has on-hand qty but no lots, create an opening lot so issue /
   * request release have a batch to draw from.
   */
  async ensureOpeningLotIfMissing(
    consumableId: string,
    actor: ActorContext
  ): Promise<void> {
    const id = consumableIdSchema.parse(consumableId);
    const row = await this.repo.findById(id, undefined, actor.tenantId);
    if (!row || row.currentQty <= 0) return;

    const existing = await this.purchaseLots.list(
      { consumableId: id, itemType: "consumable" },
      actor.tenantId
    );
    if (existing.length > 0) return;

    await withTransaction(async (tx) => {
      await this.recordOpeningLot(
        {
          row,
          quantity: row.currentQty,
          unitCost: "0.00",
          supplierName: row.supplier,
          notes: "Backfilled opening lot for on-hand quantity",
          actor,
        },
        tx
      );
    });
  }

  async update(rawId: string, rawInput: unknown, actorTenantId?: string): Promise<ConsumableDTO> {
    const id = consumableIdSchema.parse(rawId);
    const input = updateConsumableSchema.parse(rawInput);
    const existing = await this.repo.findById(id, undefined, actorTenantId);
    if (!existing) throw new NotFoundError("Consumable", id);

    let categoryName: string | undefined;
    if (input.category !== undefined) {
      categoryName = await this.resolveConsumableCategoryName(input.category);
    }

    const updated = await this.repo.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(categoryName !== undefined ? { category: categoryName } : {}),
      ...(input.classification !== undefined
        ? { classification: input.classification }
        : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.minThreshold !== undefined
        ? { minThreshold: input.minThreshold }
        : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.supplier !== undefined ? { supplier: input.supplier } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.isSandbox !== undefined ? { isSandbox: input.isSandbox } : {}),
    }, undefined, actorTenantId);
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
          tenantId: actor.tenantId,
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

      await this.auditLogs.log(
        {
          entityType: AUDIT_ENTITY.consumable,
          entityId: updated.itemCode,
          action: "restocked",
          actorName: actor.displayName,
          actorUserId: actor.userId,
          notes: `Restocked ${updated.itemCode} by ${input.quantity} ${updated.unit}.`,
          metadata: {
            itemCode: updated.itemCode,
            quantity: input.quantity,
            lotCode: lot.lotCode,
            unitCost: lot.unitCost,
          },
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

      await this.auditLogs.log(
        {
          entityType: AUDIT_ENTITY.consumable,
          entityId: updated.itemCode,
          action: "issued",
          actorName: actor.displayName,
          actorUserId: actor.userId,
          notes: `Issued ${input.quantity} ${existing.unit} from lot ${allocation.lotCode ?? preview.lotCode}.`,
          metadata: {
            itemCode: updated.itemCode,
            quantity: input.quantity,
            departmentId: dest.departmentId,
            projectId: dest.projectId,
            lotCode: allocation.lotCode ?? preview.lotCode,
          },
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
            tenantId: actor.tenantId,
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

      await this.auditLogs.log(
        {
          entityType: AUDIT_ENTITY.consumable,
          entityId: updated.itemCode,
          action: "stock_adjusted",
          actorName: actor.displayName,
          actorUserId: actor.userId,
          notes: `Adjusted ${updated.itemCode} stock by ${input.quantityChange}.`,
          metadata: {
            itemCode: updated.itemCode,
            quantityChange: input.quantityChange,
            reason: input.reason,
            notes: input.notes ?? null,
          },
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

      await this.auditLogs.log(
        {
          entityType: AUDIT_ENTITY.consumable,
          entityId: updated.itemCode,
          action: "issued",
          actorName: actor.displayName,
          actorUserId: actor.userId,
          notes: `Issued ${input.quantity} ${existing.unit} of ${updated.itemCode}.`,
          metadata: {
            itemCode: updated.itemCode,
            quantity: input.quantity,
            departmentId: dest.departmentId,
            projectId: dest.projectId,
            lotCode: result.allocation.lotCode,
          },
        },
        tx
      );

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

      await this.auditLogs.log(
        {
          entityType: AUDIT_ENTITY.consumable,
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
        },
        session
      );

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
