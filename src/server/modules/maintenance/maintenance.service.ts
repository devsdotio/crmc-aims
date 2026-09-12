import type { MaintenanceLogRow } from "@/server/db/schema";
import {
  generateOperationalCode,
  todayDateString,
} from "@/server/shared/codes";
import type { ActorContext } from "@/server/shared/auth";
import {
  ConflictError,
  NotFoundError,
} from "@/server/shared/errors";
import { withTransaction } from "@/server/db/transaction";
import { AssetRepository } from "@/server/modules/assets/asset.repository";
import { AssetLifecycleService } from "@/server/modules/assets/asset.lifecycle.service";
import { BorrowLogRepository } from "@/server/modules/borrow-log/borrow-log.repository";
import { ProjectAssetAssignmentRepository } from "@/server/modules/projects/project-asset.repository";

import { MaintenanceRepository } from "./maintenance.repository";
import type { MaintenanceLogDTO } from "./maintenance.types";
import {
  createMaintenanceSchema,
  listMaintenanceQuerySchema,
  maintenanceIdSchema,
  resolveMaintenanceSchema,
} from "./maintenance.validation";

function toDTO(row: MaintenanceLogRow): MaintenanceLogDTO {
  return {
    id: row.id,
    logCode: row.logCode,
    assetCode: row.assetCode,
    assetName: row.assetName,
    category: row.category,
    condition: row.condition,
    source: row.source,
    dateLogged: row.dateLogged,
    loggedBy: row.loggedByName,
    notes: row.notes,
    isResolved: row.isResolved,
    resolutionDate: row.resolutionDate ?? undefined,
    resolutionNotes: row.resolutionNotes ?? undefined,
    resolvedBy: row.resolvedByName ?? undefined,
    repairCost: row.repairCost ?? null,
    relatedBorrowLogCode: row.relatedBorrowLogCode ?? undefined,
    scheduledDate: row.scheduledDate ?? undefined,
  };
}

export class MaintenanceLogService {
  constructor(
    private readonly repo = new MaintenanceRepository(),
    private readonly assets = new AssetRepository(),
    private readonly lifecycle = new AssetLifecycleService(),
    private readonly borrowLogs = new BorrowLogRepository(),
    private readonly projectAssignments = new ProjectAssetAssignmentRepository()
  ) {}

  async list(rawQuery: unknown, actor?: ActorContext): Promise<MaintenanceLogDTO[]> {
    const filters = listMaintenanceQuerySchema.parse(rawQuery ?? {});
    if (actor) {
      await this.syncOrphanNeedsRepairFlags(actor, filters.includeSandbox === true);
    }
    const rows = await this.repo.list(filters);
    return rows.map(toDTO);
  }

  /**
   * Backfill open maintenance logs for assets already marked needs_repair
   * without a corresponding open log (status-only edits, legacy data).
   */
  private async syncOrphanNeedsRepairFlags(
    actor: ActorContext,
    includeSandbox: boolean
  ): Promise<void> {
    const orphans = await this.repo.findNeedsRepairWithoutOpenLog({
      includeSandbox,
    });
    if (orphans.length === 0) return;

    for (const asset of orphans) {
      // Skip in-custody orphans — they must go through return / project damage.
      if (asset.currentHolder) continue;

      await withTransaction(async (tx) => {
        const stillOpen = await this.repo.countOpenByAssetId(asset.id, tx);
        if (stillOpen > 0) return;

        const openBorrow = await this.borrowLogs.findActiveByAssetId(asset.id, tx);
        const openProject = await this.projectAssignments.findOpenByAssetId(
          asset.id,
          tx
        );
        if (openBorrow || openProject) return;

        const logCode = generateOperationalCode("MNT");
        await this.repo.create(
          {
            logCode,
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.name,
            category: asset.category,
            condition: "needs_maintenance",
            source: "manual_flag",
            dateLogged: todayDateString(),
            loggedByUserId: actor.userId,
            loggedByName: actor.displayName,
            notes:
              asset.notes?.trim() ||
              "Backfilled from needs_repair status (no prior maintenance log).",
            isResolved: false,
            resolutionDate: null,
            resolutionNotes: null,
            resolvedByUserId: null,
            resolvedByName: null,
            repairCost: null,
            relatedBorrowLogCode: null,
            scheduledDate: null,
          },
          tx
        );

        await this.lifecycle.record(
          {
            assetId: asset.id,
            assetCode: asset.assetCode,
            eventType: "flagged_maintenance",
            actor,
            fromStatus: asset.status,
            toStatus: "needs_repair",
            fromHolder: asset.currentHolder,
            toHolder: asset.currentHolder,
            payload: {
              via: "orphan_sync",
              maintenanceLogCode: logCode,
              notes: "Opened maintenance log for existing needs_repair status.",
            },
          },
          tx
        );
      });
    }
  }

  async getById(rawId: string): Promise<MaintenanceLogDTO> {
    const id = maintenanceIdSchema.parse(rawId);
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundError("Maintenance log", id);
    return toDTO(row);
  }

  /**
   * Manual flag path (Maintenance Logs hub).
   * In-custody assets must be returned / project-damage reported instead.
   * Always appends asset lifecycle events when an asset is linked.
   */
  async create(rawInput: unknown, actor: ActorContext): Promise<MaintenanceLogDTO> {
    const input = createMaintenanceSchema.parse(rawInput);

    return withTransaction(async (tx) => {
      const logCode = generateOperationalCode("MNT");

      let assetId = input.assetId ?? null;
      let asset =
        assetId != null
          ? await this.assets.findByIdForUpdate(assetId, tx)
          : null;

      if (!asset && input.assetCode) {
        const byCode = await this.assets.findByAssetCode(input.assetCode, tx);
        if (byCode) {
          asset = await this.assets.findByIdForUpdate(byCode.id, tx);
          assetId = asset?.id ?? null;
        }
      }

      const isRepairFlag =
        input.condition !== "good" && input.condition !== "resolved";

      if (isRepairFlag) {
        if (!asset || !assetId) {
          throw new NotFoundError("Asset", input.assetId ?? input.assetCode);
        }

        if (asset.status === "retired" || asset.status === "missing") {
          throw new ConflictError(
            `Assets with status “${asset.status}” cannot be flagged for maintenance.`
          );
        }

        const openBorrow = await this.borrowLogs.findActiveByAssetId(
          asset.id,
          tx
        );
        const openProject = await this.projectAssignments.findOpenByAssetId(
          asset.id,
          tx
        );

        if (openProject || asset.currentHolder) {
          if (openProject) {
            throw new ConflictError(
              "Asset is on a project. Use Report damage on the project panel to flag repair while in project custody."
            );
          }
          throw new ConflictError(
            `Asset is currently in custody${
              asset.currentHolder ? ` (${asset.currentHolder})` : ""
            }. Return it with a repair condition instead of flagging in isolation.`
          );
        }

        if (openBorrow) {
          throw new ConflictError(
            `Asset has an open borrow/release log (${openBorrow.borrowerName}). Return it before flagging for maintenance.`
          );
        }
      }

      const row = await this.repo.create(
        {
          logCode,
          assetId,
          assetCode: asset?.assetCode ?? input.assetCode,
          assetName: asset?.name ?? input.assetName,
          category: asset?.category ?? input.category,
          condition: input.condition,
          source: input.source,
          dateLogged: todayDateString(),
          loggedByUserId: actor.userId,
          loggedByName: actor.displayName,
          notes: input.notes ?? "",
          isResolved: false,
          resolutionDate: null,
          resolutionNotes: null,
          resolvedByUserId: null,
          resolvedByName: null,
          repairCost: null,
          relatedBorrowLogCode: input.relatedBorrowLogCode ?? null,
          scheduledDate: input.scheduledDate ?? null,
        },
        tx
      );

      if (asset && isRepairFlag) {
        const fromStatus = asset.status;
        const shouldFlipStatus = asset.status === "active";
        const toStatus = shouldFlipStatus ? ("needs_repair" as const) : asset.status;

        if (shouldFlipStatus) {
          await this.assets.update(
            asset.id,
            { status: "needs_repair", lastUpdated: new Date() },
            tx
          );
        }

        await this.lifecycle.record(
          {
            assetId: asset.id,
            assetCode: asset.assetCode,
            eventType: "flagged_maintenance",
            actor,
            fromStatus,
            toStatus,
            fromHolder: asset.currentHolder,
            toHolder: asset.currentHolder,
            payload: {
              via: "manual_flag",
              maintenanceLogCode: logCode,
              notes: input.notes ?? null,
              condition: input.condition,
              source: input.source,
            },
          },
          tx
        );

        if (shouldFlipStatus) {
          await this.lifecycle.record(
            {
              assetId: asset.id,
              assetCode: asset.assetCode,
              eventType: "status_changed",
              actor,
              fromStatus,
              toStatus: "needs_repair",
              payload: {
                via: "flagged_maintenance",
                maintenanceLogCode: logCode,
              },
            },
            tx
          );
        }
      }

      return toDTO(row);
    });
  }

  async resolve(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<MaintenanceLogDTO> {
    const id = maintenanceIdSchema.parse(rawId);
    const input = resolveMaintenanceSchema.parse(rawInput);

    return withTransaction(async (tx) => {
      const existing = await this.repo.findById(id, tx);
      if (!existing) throw new NotFoundError("Maintenance log", id);
      if (existing.isResolved) {
        throw new ConflictError("Maintenance log is already resolved.");
      }

      const updated = await this.repo.update(
        id,
        {
          isResolved: true,
          condition: "resolved",
          resolutionDate: input.resolutionDate ?? todayDateString(),
          resolutionNotes: input.resolutionNotes,
          resolvedByUserId: actor.userId,
          resolvedByName: input.technician?.trim() || actor.displayName,
          repairCost: input.repairCost ?? null,
        },
        tx
      );
      if (!updated) throw new NotFoundError("Maintenance log", id);

      const resolvePayload = {
        via: "maintenance_resolved" as const,
        maintenanceLogCode: existing.logCode,
        resolutionNotes: input.resolutionNotes,
        technician: input.technician?.trim() || actor.displayName,
        ...(input.repairCost != null ? { repairCost: input.repairCost } : {}),
      };

      if (existing.assetId) {
        const asset = await this.assets.findByIdForUpdate(existing.assetId, tx);
        if (asset) {
          const stillOpen = await this.repo.countOpenByAssetId(asset.id, tx);
          const canReactivate =
            asset.status === "needs_repair" && stillOpen === 0;

          if (canReactivate) {
            await this.assets.update(
              asset.id,
              { status: "active", lastUpdated: new Date() },
              tx
            );
            await this.lifecycle.record(
              {
                assetId: asset.id,
                assetCode: asset.assetCode,
                eventType: "status_changed",
                actor,
                fromStatus: asset.status,
                toStatus: "active",
                fromHolder: asset.currentHolder,
                toHolder: asset.currentHolder,
                payload: {
                  ...resolvePayload,
                  remainingOpenLogs: 0,
                },
              },
              tx
            );
          } else {
            // Log closed but asset stays needs_repair (or other status).
            await this.lifecycle.record(
              {
                assetId: asset.id,
                assetCode: asset.assetCode,
                eventType: "updated",
                actor,
                fromStatus: asset.status,
                toStatus: asset.status,
                fromHolder: asset.currentHolder,
                toHolder: asset.currentHolder,
                payload: {
                  ...resolvePayload,
                  remainingOpenLogs: stillOpen,
                  notes: input.resolutionNotes,
                },
              },
              tx
            );
          }
        }
      }

      return toDTO(updated);
    });
  }
}
