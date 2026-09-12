import type {
  ProjectAssetAssignmentRow,
  ProjectExpenseMetadata,
} from "@/server/db/schema";
import type { ActorContext } from "@/server/shared/auth";
import {
  generateOperationalCode,
  todayDateString,
} from "@/server/shared/codes";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/server/shared/errors";
import { withTransaction } from "@/server/db/transaction";
import { AssetRepository } from "@/server/modules/assets/asset.repository";
import { AssetLifecycleService } from "@/server/modules/assets/asset.lifecycle.service";
import { MaintenanceRepository } from "@/server/modules/maintenance/maintenance.repository";

import { ProjectRepository } from "./project.repository";
import { ProjectAssetAssignmentRepository } from "./project-asset.repository";
import { ProjectExpenseRepository } from "./project-expense.repository";
import { BorrowLogService } from "@/server/modules/borrow-log/borrow-log.service";
import { BorrowLogRepository } from "@/server/modules/borrow-log/borrow-log.repository";
import { projectHolderLabel } from "@/server/shared/custody-labels";
import type {
  ProjectAssetAssignmentDTO,
  ProjectAssetDamageReportDTO,
} from "./project-asset.types";
import {
  assignAssetToProjectSchema,
  assignmentIdSchema,
  reportProjectAssetDamageSchema,
  returnProjectAssetSchema,
} from "./project-asset.validation";
import { projectIdSchema } from "./project.validation";

function holderLabel(projectCode: string, projectName: string): string {
  return projectHolderLabel(projectCode, projectName);
}

function toDTO(row: ProjectAssetAssignmentRow): ProjectAssetAssignmentDTO {
  return {
    id: row.id,
    projectId: row.projectId,
    assetId: row.assetId,
    assetCode: row.assetCode,
    assetName: row.assetName,
    status: row.status,
    assignedAt:
      row.assignedAt instanceof Date
        ? row.assignedAt.toISOString()
        : String(row.assignedAt),
    returnedAt: row.returnedAt
      ? row.returnedAt instanceof Date
        ? row.returnedAt.toISOString()
        : String(row.returnedAt)
      : null,
    assignedByName: row.assignedByName,
    returnedByName: row.returnedByName ?? null,
    notes: row.notes ?? null,
    returnNotes: row.returnNotes ?? null,
  };
}

function parseMoney(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export class ProjectAssetService {
  constructor(
    private readonly assignments = new ProjectAssetAssignmentRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly assets = new AssetRepository(),
    private readonly lifecycle = new AssetLifecycleService(),
    private readonly maintenance = new MaintenanceRepository(),
    private readonly expenses = new ProjectExpenseRepository(),
    private readonly borrowLogs = new BorrowLogService(),
    private readonly borrowLogRepo = new BorrowLogRepository()
  ) {}

  private async requireMutableProject(projectId: string) {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundError("Project", projectId);
    if (project.status === "completed") {
      throw new ConflictError(
        "Completed projects are read-only. Asset assignments cannot be changed."
      );
    }
    return project;
  }

  async list(
    rawProjectId: string,
    status?: "assigned" | "returned" | "written_off" | "all"
  ): Promise<ProjectAssetAssignmentDTO[]> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundError("Project", projectId);

    const filter =
      !status || status === "all"
        ? undefined
        : (status as "assigned" | "returned" | "written_off");

    const rows = await this.assignments.listByProject(projectId, filter);
    return rows.map(toDTO);
  }

  async assign(
    rawProjectId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ProjectAssetAssignmentDTO> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const project = await this.requireMutableProject(projectId);
    const input = assignAssetToProjectSchema.parse(rawInput);

    // Single TX: release creates borrow log + holder + project_asset_assignments.
    return withTransaction(async (tx) => {
      await this.borrowLogs.release(
        {
          assetId: input.assetId,
          projectId,
          custodyKind: "assignment",
          source: "project_legacy",
          borrowerName: holderLabel(project.projectCode, project.name),
          notes: input.notes,
        },
        actor,
        tx
      );

      const assignment = await this.assignments.findOpenByAssetId(
        input.assetId,
        tx
      );
      if (!assignment) {
        throw new ConflictError(
          "Project assignment was not created. Try again or check asset availability."
        );
      }

      return toDTO(assignment);
    });
  }

  async returnAsset(
    rawProjectId: string,
    rawAssignmentId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ProjectAssetAssignmentDTO> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const assignmentId = assignmentIdSchema.parse(rawAssignmentId);
    await this.requireMutableProject(projectId);
    const input = returnProjectAssetSchema.parse(rawInput ?? {});

    return withTransaction(async (tx) => {
      const assignment = await this.assignments.findById(assignmentId, tx);
      if (!assignment || assignment.projectId !== projectId) {
        throw new NotFoundError("Project asset assignment", assignmentId);
      }
      if (assignment.status !== "assigned") {
        throw new ConflictError("This assignment is no longer open.");
      }

      const openLog = await this.borrowLogRepo.findActiveByAssetId(
        assignment.assetId,
        tx
      );
      if (openLog) {
        // Closes borrow log + assignment + clears holder in one nested path.
        await this.borrowLogs.returnLog(
          openLog.id,
          {
            condition: "good",
            conditionNotes: input.notes,
          },
          actor,
          tx
        );
      }

      let updated = await this.assignments.findById(assignmentId, tx);
      if (updated?.status === "assigned") {
        updated = await this.assignments.update(
          assignment.id,
          {
            status: "returned",
            returnedAt: new Date(),
            returnedByUserId: actor.userId,
            returnedByName: actor.displayName,
            returnNotes: input.notes ?? null,
          },
          tx
        );
      }

      // Always clear holder even if borrow log was already missing (legacy orphan).
      const asset = await this.assets.findById(assignment.assetId, tx);
      if (asset?.currentHolder) {
        await this.assets.update(
          assignment.assetId,
          { currentHolder: null, lastUpdated: new Date() },
          tx
        );
      }

      if (!updated) throw new NotFoundError("Project asset assignment", assignmentId);
      return toDTO(updated);
    });
  }

  /**
   * Phase 5: damage on project custody.
   * - maintenance: keep on project, flag needs_repair + MNT log
   * - write_off: close assignment as written_off, charge expense, status OOS/retired
   */
  async reportDamage(
    rawProjectId: string,
    rawAssignmentId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ProjectAssetDamageReportDTO> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const assignmentId = assignmentIdSchema.parse(rawAssignmentId);
    const project = await this.requireMutableProject(projectId);
    const input = reportProjectAssetDamageSchema.parse(rawInput);

    return withTransaction(async (tx) => {
      const assignment = await this.assignments.findById(assignmentId, tx);
      if (!assignment || assignment.projectId !== projectId) {
        throw new NotFoundError("Project asset assignment", assignmentId);
      }
      if (assignment.status !== "assigned") {
        throw new ConflictError(
          "Only open assignments can be reported as damaged."
        );
      }

      const asset = await this.assets.findByIdForUpdate(assignment.assetId, tx);
      if (!asset) throw new NotFoundError("Asset", assignment.assetId);

      if (asset.status === "retired") {
        throw new ConflictError("Retired assets cannot be reported here.");
      }

      const mntCode = generateOperationalCode("MNT");
      const notes = input.notes.trim();
      const descriptionText =
        input.description?.trim() ||
        (input.mode === "write_off"
          ? `Written off on ${project.projectCode}: ${asset.name}`
          : `Damaged on ${project.projectCode}: ${asset.name}`);

      if (input.mode === "maintenance") {
        const nextStatus = "needs_repair" as const;

        await this.assets.update(
          asset.id,
          {
            status: nextStatus,
            lastUpdated: new Date(),
          },
          tx
        );

        await this.maintenance.create(
          {
            logCode: mntCode,
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.name,
            category: asset.category,
            condition: "damaged",
            source: "project_assignment",
            dateLogged: todayDateString(),
            loggedByUserId: actor.userId,
            loggedByName: actor.displayName,
            notes: [
              `Project ${project.projectCode}`,
              descriptionText,
              notes,
            ]
              .filter(Boolean)
              .join(" — "),
            isResolved: false,
            resolutionDate: null,
            resolutionNotes: null,
            resolvedByUserId: null,
            resolvedByName: null,
            repairCost: null,
            relatedBorrowLogCode: project.projectCode,
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
            toStatus: nextStatus,
            fromHolder: asset.currentHolder,
            toHolder: asset.currentHolder,
            payload: {
              projectId,
              projectCode: project.projectCode,
              assignmentId: assignment.id,
              maintenanceLogCode: mntCode,
              source: "project_assignment",
              mode: "maintenance",
              notes,
            },
          },
          tx
        );

        if (asset.status !== nextStatus) {
          await this.lifecycle.record(
            {
              assetId: asset.id,
              assetCode: asset.assetCode,
              eventType: "status_changed",
              actor,
              fromStatus: asset.status,
              toStatus: nextStatus,
              payload: {
                via: "project_damage_maintenance",
                projectId,
                maintenanceLogCode: mntCode,
              },
            },
            tx
          );
        }

        return {
          assignment: toDTO(assignment),
          mode: "maintenance" as const,
          maintenanceLogCode: mntCode,
          expenseId: null,
          expenseAmount: null,
        };
      }

      // —— write_off ——
      const disposition =
        input.assetStatus ?? ("out_of_service" as const);
      const amount =
        input.amount ??
        parseMoney(asset.value) ??
        "0.00";

      // Close active borrow log first so borrow-log UI doesn't keep a ghost custody.
      await this.borrowLogs.closeActiveBorrowLogOnlyInTx(
        asset.id,
        actor,
        `Write-off on project ${project.projectCode}: ${notes}`,
        tx
      );

      const updated = await this.assignments.update(
        assignment.id,
        {
          status: "written_off",
          returnedAt: new Date(),
          returnedByUserId: actor.userId,
          returnedByName: actor.displayName,
          returnNotes: notes,
        },
        tx
      );
      if (!updated) {
        throw new NotFoundError("Project asset assignment", assignmentId);
      }

      await this.assets.update(
        asset.id,
        {
          status: disposition,
          currentHolder: null,
          lastUpdated: new Date(),
        },
        tx
      );

      await this.maintenance.create(
        {
          logCode: mntCode,
          assetId: asset.id,
          assetCode: asset.assetCode,
          assetName: asset.name,
          category: asset.category,
          condition: "damaged",
          source: "project_assignment",
          dateLogged: todayDateString(),
          loggedByUserId: actor.userId,
          loggedByName: actor.displayName,
          notes: [
            `Write-off on project ${project.projectCode}`,
            descriptionText,
            notes,
            `Charge ₱${amount}`,
          ]
            .filter(Boolean)
            .join(" — "),
          isResolved: false,
          resolutionDate: null,
          resolutionNotes: null,
          resolvedByUserId: null,
          resolvedByName: null,
          repairCost: null,
          relatedBorrowLogCode: project.projectCode,
          scheduledDate: null,
        },
        tx
      );

      const metadata: ProjectExpenseMetadata = {
        assignmentId: assignment.id,
        assetCode: asset.assetCode,
        assetName: asset.name,
        maintenanceLogCode: mntCode,
        writeOffDisposition: disposition,
      };

      const expense = await this.expenses.create(
        {
          projectId,
          lineType: "asset_writeoff",
          category: "broken_asset",
          description: descriptionText,
          amount,
          quantity: "1.00",
          unitCost: amount,
          consumableId: null,
          assetId: asset.id,
          incurredOn: input.incurredOn ?? todayDateString(),
          notes,
          metadata,
          recordedByUserId: actor.userId,
          recordedByName: actor.displayName,
        },
        tx
      );

      await this.lifecycle.record(
        {
          assetId: asset.id,
          assetCode: asset.assetCode,
          eventType: "returned",
          actor,
          fromStatus: asset.status,
          toStatus: disposition,
          fromHolder: asset.currentHolder,
          toHolder: null,
          payload: {
            projectId,
            projectCode: project.projectCode,
            assignmentId: assignment.id,
            source: "project_writeoff",
            maintenanceLogCode: mntCode,
            expenseId: expense.id,
          },
        },
        tx
      );

      await this.lifecycle.record(
        {
          assetId: asset.id,
          assetCode: asset.assetCode,
          eventType: "status_changed",
          actor,
          fromStatus: asset.status,
          toStatus: disposition,
          payload: {
            via: "project_writeoff",
            projectId,
            maintenanceLogCode: mntCode,
            expenseId: expense.id,
          },
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
          toStatus: disposition,
          fromHolder: asset.currentHolder,
          toHolder: null,
          payload: {
            projectId,
            maintenanceLogCode: mntCode,
            mode: "write_off",
            notes,
          },
        },
        tx
      );

      return {
        assignment: toDTO(updated),
        mode: "write_off" as const,
        maintenanceLogCode: mntCode,
        expenseId: expense.id,
        expenseAmount: amount,
      };
    });
  }
}
