import type { BorrowTransactionRow } from "@/server/db/schema";
import {
  dueDatePlusDays,
  generateOperationalCode,
  isoNow,
  todayDateString,
} from "@/server/shared/codes";
import type { ActorContext } from "@/server/shared/auth";
import { isAssetOperatorRole } from "@/server/shared/roles";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from "@/server/shared/errors";
import {
  departmentHolderLabel,
  projectHolderLabel,
} from "@/server/shared/custody-labels";
import { DepartmentRepository } from "@/server/modules/departments/department.repository";
import { ProjectRepository } from "@/server/modules/projects/project.repository";
import { ProjectAssetAssignmentRepository } from "@/server/modules/projects/project-asset.repository";
import {
  isUniqueViolation,
  withTransaction,
  type DbSession,
} from "@/server/db/transaction";
import { AssetRepository } from "@/server/modules/assets/asset.repository";
import { AssetLifecycleService } from "@/server/modules/assets/asset.lifecycle.service";
import { BorrowRequestRepository } from "@/server/modules/borrow-requests/borrow-request.repository";
import { MaintenanceRepository } from "@/server/modules/maintenance/maintenance.repository";

import type { AuditLogRow } from "@/server/db/schema/audit-logs";
import { BorrowLogRepository } from "./borrow-log.repository";
import type { BorrowLogDTO } from "./borrow-log.types";
import {
  borrowLogIdSchema,
  listBorrowLogQuerySchema,
  releaseBorrowSchema,
  returnBorrowSchema,
  voidBorrowSchema,
} from "./borrow-log.validation";

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Derive custody timeline from the transaction row — no audit_logs writes. */
function custodyHistoryFromRow(row: BorrowTransactionRow): AuditLogRow[] {
  const released: AuditLogRow = {
    id: `${row.id}-released`,
    entityType: "borrow_transaction",
    entityId: row.id,
    action: "released",
    actorName: row.releasedByName,
    actorUserId: row.releasedByUserId,
    timestamp: asDate(row.releasedAt),
    notes: null,
    metadata: null,
  };
  if (!row.returnedAt && row.status !== "voided") return [released];

  const isVoided = row.status === "voided";
  const flagged =
    !isVoided &&
    (row.conditionOnReturn === "needs_repair" ||
      row.conditionOnReturn === "damaged");
  return [
    released,
    {
      id: `${row.id}-${isVoided ? "voided" : "returned"}`,
      entityType: "borrow_transaction",
      entityId: row.id,
      action: isVoided ? "voided" : flagged ? "flagged_repair" : "returned",
      actorName: row.receivedByName ?? row.releasedByName,
      actorUserId: row.receivedByUserId,
      timestamp: asDate(row.returnedAt ?? row.updatedAt),
      notes: row.conditionNotes,
      metadata: null,
    },
  ];
}

export function toBorrowLogDTO(row: BorrowTransactionRow): BorrowLogDTO {
  const today = todayDateString();
  let status: BorrowLogDTO["status"] = "active";
  let daysOverdue: number | undefined;

  if (row.status === "voided") {
    status = "voided";
  } else if (row.status === "returned") {
    status = "returned";
  } else if (row.dueDate && row.dueDate < today) {
    status = "overdue";
    daysOverdue = daysBetween(row.dueDate, today);
  }

  return {
    id: row.id,
    logCode: row.logCode,
    requestCode: row.requestCode ?? "",
    custodyKind: row.custodyKind ?? "borrow",
    departmentId: row.departmentId,
    projectId: row.projectId,
    source: row.source ?? "portal",
    requestedByName: row.requestedByName ?? undefined,
    borrowerName: row.borrowerName,
    borrowerEmail: row.borrowerEmail,
    borrowerPhone: row.borrowerPhone,
    department: row.department,
    assetCode: row.assetCode,
    assetName: row.assetName,
    category: row.category,
    releasedAt: asIso(row.releasedAt),
    dueDate: row.dueDate ?? null,
    returnedAt: row.returnedAt ? asIso(row.returnedAt) : undefined,
    daysOverdue,
    status,
    conditionOnReturn: row.conditionOnReturn ?? undefined,
    conditionNotes: row.conditionNotes ?? undefined,
    releasedBy: row.releasedByName,
    receivedBy: row.receivedByName ?? undefined,
    history: custodyHistoryFromRow(row),
  };
}

/**
 * Custody authority for coded equipment.
 * Release/return always write: borrow log + asset holder + lifecycle (atomic).
 * Optional: request status + maintenance open case.
 */
export class BorrowLogService {
  constructor(
    private readonly repo = new BorrowLogRepository(),
    private readonly assets = new AssetRepository(),
    private readonly lifecycle = new AssetLifecycleService(),
    private readonly requests = new BorrowRequestRepository(),
    private readonly maintenance = new MaintenanceRepository(),
    private readonly departments = new DepartmentRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly projectAssignments = new ProjectAssetAssignmentRepository()
  ) {}

  async list(rawQuery: unknown, actor?: ActorContext): Promise<BorrowLogDTO[]> {
    const parsed = listBorrowLogQuerySchema.parse(rawQuery ?? {});
    const filters: import("./borrow-log.types").ListBorrowLogFilters = {
      status: parsed.status,
      department: parsed.department,
      search: parsed.search,
      borrowerUserId: parsed.borrowerUserId,
      borrowerEmail: parsed.borrowerEmail,
      custodyKind: parsed.custodyKind,
      includeSandbox: parsed.includeSandbox,
    };

    if (actor && !isAssetOperatorRole(actor.role)) {
      const includeSandboxForDept = await this.departmentAllowsSandbox(
        actor.departmentId
      );

      if (parsed.scope === "department") {
        if (!actor.departmentId) {
          throw new BadRequestError(
            "Your account is not linked to a department. Ask Property Custodian to assign one."
          );
        }
        // All open department holds (borrow + assignable-to-dept), never projects.
        filters.departmentId = actor.departmentId;
        filters.excludeProjects = true;
        filters.custodyKind = "all";
        filters.heldOnly = true;
        filters.includeSandbox = includeSandboxForDept;
        delete filters.status;
        delete filters.borrowerUserId;
        delete filters.borrowerEmail;
        delete filters.department;
      } else {
        filters.borrowerUserId = actor.userId;
        if (actor.email) {
          filters.borrowerEmail = actor.email;
        }
        // Sandbox department accounts must see sandbox assets in personal history too.
        if (includeSandboxForDept) {
          filters.includeSandbox = true;
        }
      }
    }

    const rows = await this.repo.list(filters);
    return rows.map((row) => toBorrowLogDTO(row));
  }

  async getById(rawId: string, actor?: ActorContext): Promise<BorrowLogDTO> {
    const id = borrowLogIdSchema.parse(rawId);
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundError("Borrow log", id);
    if (actor && !isAssetOperatorRole(actor.role)) {
      const isOwn = row.borrowerUserId === actor.userId;
      const isDeptInventory =
        Boolean(actor.departmentId) &&
        row.departmentId === actor.departmentId &&
        row.projectId == null;
      if (!isOwn && !isDeptInventory) {
        throw new ForbiddenError("You are not allowed to view this log.");
      }
    }
    return toBorrowLogDTO(row);
  }

  /** Sandbox departments may see sandbox assets/logs tied to them. */
  private async departmentAllowsSandbox(
    departmentId: string | null | undefined
  ): Promise<boolean> {
    if (!departmentId) return false;
    const dept = await this.departments.findById(departmentId);
    return Boolean(dept?.isSandbox);
  }

  /**
   * Atomic release: lock asset → open log → set holder → lifecycle.
   * Race-safe via FOR UPDATE + unique index on one active log per asset.
   * Pass `session` to join an outer transaction (multi-unit release / project assign).
   */
  async release(
    rawInput: unknown,
    actor: ActorContext,
    session?: DbSession
  ): Promise<BorrowLogDTO> {
    const input = releaseBorrowSchema.parse(rawInput);
    const run = (tx: DbSession) => this.releaseInTx(input, actor, tx);

    try {
      if (session) return await run(session);
      return await withTransaction(run);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          "Asset already has an active borrow log (concurrent release prevented)."
        );
      }
      throw error;
    }
  }

  /**
   * Close an active borrow log without clearing holder / project assignment.
   * Used by project write-off which owns those fields itself.
   */
  async closeActiveBorrowLogOnlyInTx(
    assetId: string,
    actor: ActorContext,
    notes: string | undefined,
    tx: DbSession
  ): Promise<void> {
    const open = await this.repo.findActiveByAssetId(assetId, tx);
    if (!open) return;

    await this.repo.update(
      open.id,
      {
        status: "returned",
        returnedAt: new Date(),
        conditionOnReturn: "damaged",
        conditionNotes: notes ?? null,
        receivedByName: actor.displayName,
      },
      tx
    );
  }

  private async resolveDestination(
    input: ReturnType<typeof releaseBorrowSchema.parse>,
    tx: DbSession
  ): Promise<{
    departmentId: string | null;
    projectId: string | null;
    departmentLabel: string;
    holderLabel: string;
    custodyKind: "borrow" | "assignment";
  }> {
    const departmentId = input.departmentId ?? null;
    const projectId = input.projectId ?? null;

    if (departmentId && projectId) {
      throw new BadRequestError(
        "Specify exactly one destination: department or project."
      );
    }

    const custodyKind =
      input.custodyKind ?? (input.dueDate ? "borrow" : "assignment");

    if (custodyKind === "borrow" && !input.dueDate) {
      throw new BadRequestError("dueDate is required for borrowable custody.");
    }

    if (projectId) {
      const project = await this.projects.findById(projectId, tx);
      if (!project) throw new NotFoundError("Project", projectId);
      return {
        departmentId: null,
        projectId,
        departmentLabel: project.department?.trim() || project.name,
        holderLabel: projectHolderLabel(project.projectCode, project.name),
        custodyKind,
      };
    }

    if (departmentId) {
      const dept = await this.departments.findById(departmentId, tx);
      if (!dept) throw new NotFoundError("Department", departmentId);
      return {
        departmentId,
        projectId: null,
        departmentLabel: dept.name,
        holderLabel: departmentHolderLabel(dept.code, dept.name),
        custodyKind,
      };
    }

    throw new BadRequestError(
      "Destination department or project is required."
    );
  }

  private async releaseInTx(
    input: ReturnType<typeof releaseBorrowSchema.parse>,
    actor: ActorContext,
    tx: DbSession
  ): Promise<BorrowLogDTO> {
    const asset = await this.assets.findByIdForUpdate(input.assetId, tx);
    if (!asset) throw new NotFoundError("Asset", input.assetId);

    if (asset.status !== "active" || asset.currentHolder) {
      throw new ConflictError("Asset is not available for release.");
    }

    const destination = await this.resolveDestination(input, tx);

    if (destination.custodyKind === "borrow" && asset.assignmentType !== "borrowable") {
      throw new BadRequestError(
        "Only borrowable assets can be released on a due-dated borrow."
      );
    }
    if (
      destination.custodyKind === "assignment" &&
      asset.assignmentType !== "assignable"
    ) {
      throw new BadRequestError(
        "Only assignable assets can be assigned long-term."
      );
    }

    const open = await this.repo.findActiveByAssetId(asset.id, tx);
    if (open) {
      throw new ConflictError("Asset already has an active custody log.");
    }

    const openProject = await this.projectAssignments.findOpenByAssetId(
      asset.id,
      tx
    );
    if (openProject) {
      // Orphaned ledger: assignment still "assigned" but asset is already back
      // in stock (no holder). Close it so availability and release stay aligned.
      if (!asset.currentHolder) {
        await this.projectAssignments.update(
          openProject.id,
          {
            status: "returned",
            returnedAt: new Date(),
            returnedByUserId: actor.userId,
            returnedByName: actor.displayName,
            returnNotes:
              "Auto-closed orphaned project assignment (asset already returned to stock).",
          },
          tx
        );
      } else {
        throw new ConflictError(
          "Asset already has an open project assignment. Return it first."
        );
      }
    }

    let requestId: string | null = input.requestId ?? null;
    let requestCode: string | null = input.requestCode ?? null;

    if (input.requestId) {
      const req = await this.requests.findById(input.requestId, tx);
      if (!req) throw new NotFoundError("Borrow request", input.requestId);
      if (req.status !== "approved") {
        throw new ConflictError("Borrow request must be approved before release.");
      }
      requestCode = req.requestCode;
      requestId = req.id;
    }

    const logCode = generateOperationalCode("LOG");
    const displayName =
      input.borrowerName?.trim() ||
      input.requestedByName?.trim() ||
      destination.holderLabel;

    const row = await this.repo.create(
      {
        logCode,
        requestId,
        requestCode,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.name,
        category: asset.category,
        borrowerUserId: input.borrowerUserId ?? null,
        borrowerName: displayName,
        borrowerEmail: (input.borrowerEmail ?? "").toLowerCase(),
        borrowerPhone: input.borrowerPhone ?? "",
        department: destination.departmentLabel,
        custodyKind: destination.custodyKind,
        departmentId: destination.departmentId,
        projectId: destination.projectId,
        source: input.source ?? "portal",
        requestedByName: input.requestedByName ?? null,
        releasedAt: new Date(),
        dueDate: destination.custodyKind === "borrow" ? input.dueDate! : null,
        returnedAt: null,
        status: "active",
        conditionOnReturn: null,
        conditionNotes: null,
        releasedByUserId: actor.userId,
        releasedByName: actor.displayName,
        receivedByName: null,
      },
      tx
    );

    await this.assets.update(
      asset.id,
      {
        currentHolder: destination.holderLabel,
        department: destination.departmentLabel,
        reservedForRequestId: null,
        lastUpdated: new Date(),
      },
      tx
    );

    // Keep project panel in sync whenever custody goes to a project
    // (Issue from assets page and Project → Assign share this path).
    if (destination.projectId) {
      const alreadyOpen = await this.projectAssignments.findOpenByAssetId(
        asset.id,
        tx
      );
      if (!alreadyOpen) {
        await this.projectAssignments.create(
          {
            projectId: destination.projectId,
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.name,
            status: "assigned",
            assignedAt: new Date(),
            returnedAt: null,
            assignedByUserId: actor.userId,
            assignedByName: actor.displayName,
            returnedByUserId: null,
            returnedByName: null,
            notes: input.notes ?? null,
            returnNotes: null,
          },
          tx
        );
      }
    }

    await this.lifecycle.record(
      {
        assetId: asset.id,
        assetCode: asset.assetCode,
        eventType: "released",
        actor,
        fromStatus: asset.status,
        toStatus: asset.status,
        fromHolder: asset.currentHolder,
        toHolder: destination.holderLabel,
        payload: {
          logCode,
          logId: row.id,
          requestCode,
          requestId,
          dueDate: row.dueDate,
          custodyKind: destination.custodyKind,
          departmentId: destination.departmentId,
          projectId: destination.projectId,
          source: input.source ?? "portal",
          notes: input.notes ?? null,
          borrowerEmail: input.borrowerEmail ?? null,
        },
      },
      tx
    );

    return toBorrowLogDTO(row);
  }

  /**
   * Atomic return: lock log → close → clear holder → lifecycle
   * → optional maintenance case → mark request returned.
   * Pass `session` to join an outer transaction (project return).
   */
  async returnLog(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext,
    session?: DbSession,
    options?: { skipRequestClosure?: boolean }
  ): Promise<BorrowLogDTO> {
    const id = borrowLogIdSchema.parse(rawId);
    const input = returnBorrowSchema.parse(rawInput);
    const run = (tx: DbSession) =>
      this.returnLogInTx(id, input, actor, tx, options);
    if (session) return run(session);
    return withTransaction(run);
  }

  private async returnLogInTx(
    id: string,
    input: ReturnType<typeof returnBorrowSchema.parse>,
    actor: ActorContext,
    tx: DbSession,
    options?: { skipRequestClosure?: boolean }
  ): Promise<BorrowLogDTO> {
      const existing = await this.repo.findByIdForUpdate(id, tx);
      if (!existing) throw new NotFoundError("Borrow log", id);
      if (existing.status !== "active") {
        throw new ConflictError("Only active borrow logs can be returned.");
      }

      const isMissing =
        input.condition === "lost" || input.condition === "stolen";
      const needsMaint =
        !isMissing &&
        (input.condition === "needs_repair" ||
          input.condition === "damaged" ||
          Boolean(input.flagMaintenance));

      const updated = await this.repo.update(
        id,
        {
          status: "returned",
          returnedAt: new Date(),
          conditionOnReturn: input.condition,
          conditionNotes: input.conditionNotes ?? null,
          receivedByName: actor.displayName,
          receivedByUserId: actor.userId,
        },
        tx
      );
      if (!updated) throw new NotFoundError("Borrow log", id);

      if (existing.assetId) {
        const asset = await this.assets.findByIdForUpdate(existing.assetId, tx);
        if (asset) {
          const nextStatus = isMissing
            ? ("missing" as const)
            : needsMaint
              ? ("needs_repair" as const)
              : asset.status;

          // Keep project_asset_assignments in sync with the custody ledger.
          // Returning via borrow-log / assets page used to clear currentHolder
          // while leaving status=assigned, so the UI showed Available but
          // release still blocked on the open project row.
          const openProject = await this.projectAssignments.findOpenByAssetId(
            asset.id,
            tx
          );
          if (openProject) {
            await this.projectAssignments.update(
              openProject.id,
              {
                status: "returned",
                returnedAt: new Date(),
                returnedByUserId: actor.userId,
                returnedByName: actor.displayName,
                returnNotes:
                  input.conditionNotes?.trim() ||
                  `Returned via custody log ${existing.logCode}`,
              },
              tx
            );
          }

          await this.assets.update(
            asset.id,
            {
              currentHolder: null,
              status: nextStatus,
              lastUpdated: new Date(),
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
              toStatus: nextStatus,
              fromHolder: existing.borrowerName,
              toHolder: null,
              payload: {
                logCode: existing.logCode,
                logId: existing.id,
                condition: input.condition,
                // Persist under both keys so asset detail + older readers show notes.
                conditionNotes: input.conditionNotes ?? null,
                notes: input.conditionNotes ?? null,
                source: existing.source ?? "portal",
                requestCode: existing.requestCode ?? null,
                requestId: existing.requestId ?? null,
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
                payload: { via: "borrow_return", logCode: existing.logCode },
              },
              tx
            );
          }

          if (needsMaint) {
            const mntCode = generateOperationalCode("MNT");
            await this.maintenance.create(
              {
                logCode: mntCode,
                assetId: asset.id,
                assetCode: asset.assetCode,
                assetName: asset.name,
                category: asset.category,
                condition:
                  input.condition === "damaged" ? "damaged" : "needs_maintenance",
                source: "return_checkout",
                dateLogged: todayDateString(),
                loggedByUserId: actor.userId,
                loggedByName: actor.displayName,
                notes:
                  input.conditionNotes?.trim() ||
                  `Returned with condition: ${input.condition}`,
                isResolved: false,
                resolutionDate: null,
                resolutionNotes: null,
                resolvedByUserId: null,
                resolvedByName: null,
                repairCost: null,
                relatedBorrowLogCode: existing.logCode,
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
                fromStatus: nextStatus,
                toStatus: nextStatus,
                fromHolder: null,
                toHolder: null,
                payload: {
                  via: "borrow_return",
                  maintenanceLogCode: mntCode,
                  relatedBorrowLogCode: existing.logCode,
                },
              },
              tx
            );
          }
        }
      }

      if (existing.requestId && !options?.skipRequestClosure) {
        const req = await this.requests.findById(existing.requestId, tx);
        if (req && (req.status === "released" || req.status === "approved")) {
          const otherActive = await this.repo.list(
            { status: "active" },
            tx
          );
          const hasRemaining = otherActive.some(
            (o) => o.requestId === existing.requestId && o.id !== existing.id
          );

          await this.requests.update(
            req.id,
            {
              status: hasRemaining ? "released" : "returned",
              history: [
                ...(Array.isArray(req.history) ? req.history : []),
                {
                  id: crypto.randomUUID(),
                  action: "returned",
                  actor: actor.displayName,
                  timestamp: isoNow(),
                  note: hasRemaining
                    ? `Item ${existing.assetCode} returned via custody log ${existing.logCode}`
                    : `Via custody log ${existing.logCode}`,
                },
              ],
            },
            tx
          );
        }
      }

      return toBorrowLogDTO(updated);
  }

  /**
   * Soft-void an active custody issue (undo mistaken manual release).
   * Restores the asset to stock and keeps the log row for audit.
   * Portal/request releases are blocked — use the normal return path instead.
   */
  async voidLog(
    rawId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<BorrowLogDTO> {
    const id = borrowLogIdSchema.parse(rawId);
    const input = voidBorrowSchema.parse(rawInput ?? {});

    return withTransaction(async (tx) => {
      const existing = await this.repo.findByIdForUpdate(id, tx);
      if (!existing) throw new NotFoundError("Borrow log", id);
      if (existing.status !== "active") {
        throw new ConflictError("Only active custody issues can be voided.");
      }
      if (existing.source === "portal") {
        throw new BadRequestError(
          "Only manual or project issues can be voided. Request-based releases must be returned through the normal return flow."
        );
      }

      const reason = input.reason;
      const now = new Date();

      const updated = await this.repo.update(
        id,
        {
          status: "voided",
          returnedAt: now,
          conditionOnReturn: "good",
          conditionNotes: `[VOIDED] ${reason}`,
          receivedByName: actor.displayName,
          receivedByUserId: actor.userId,
        },
        tx
      );
      if (!updated) throw new NotFoundError("Borrow log", id);

      if (existing.assetId) {
        const asset = await this.assets.findByIdForUpdate(existing.assetId, tx);
        if (asset) {
          const openProject = await this.projectAssignments.findOpenByAssetId(
            asset.id,
            tx
          );
          if (openProject) {
            await this.projectAssignments.update(
              openProject.id,
              {
                status: "returned",
                returnedAt: now,
                returnedByUserId: actor.userId,
                returnedByName: actor.displayName,
                returnNotes: `Voided mistaken issue ${existing.logCode}: ${reason}`,
              },
              tx
            );
          }

          await this.assets.update(
            asset.id,
            {
              currentHolder: null,
              lastUpdated: now,
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
              toStatus: asset.status,
              fromHolder: existing.borrowerName,
              toHolder: null,
              payload: {
                voided: true,
                logCode: existing.logCode,
                logId: existing.id,
                notes: reason,
                conditionNotes: `[VOIDED] ${reason}`,
                source: existing.source,
              },
            },
            tx
          );
        }
      }

      return toBorrowLogDTO(updated);
    });
  }

  /**
   * Superadmin-only permanent removal of a custody log.
   * If still active, clears asset holder / open project assignment first.
   */
  async hardDelete(rawId: string, actor: ActorContext): Promise<void> {
    if (actor.role !== "superadmin") {
      throw new ForbiddenError(
        "Only superadmin can permanently delete custody logs."
      );
    }
    const id = borrowLogIdSchema.parse(rawId);

    await withTransaction(async (tx) => {
      const existing = await this.repo.findByIdForUpdate(id, tx);
      if (!existing) throw new NotFoundError("Borrow log", id);

      const now = new Date();

      if (existing.status === "active" && existing.assetId) {
        const asset = await this.assets.findByIdForUpdate(existing.assetId, tx);
        if (asset) {
          const openProject = await this.projectAssignments.findOpenByAssetId(
            asset.id,
            tx
          );
          if (openProject) {
            await this.projectAssignments.update(
              openProject.id,
              {
                status: "returned",
                returnedAt: now,
                returnedByUserId: actor.userId,
                returnedByName: actor.displayName,
                returnNotes: `Hard-deleted custody log ${existing.logCode}`,
              },
              tx
            );
          }

          await this.assets.update(
            asset.id,
            {
              currentHolder: null,
              lastUpdated: now,
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
              toStatus: asset.status,
              fromHolder: existing.borrowerName,
              toHolder: null,
              payload: {
                hardDeleted: true,
                logCode: existing.logCode,
                logId: existing.id,
                notes: `Custody log ${existing.logCode} permanently deleted`,
                source: existing.source,
              },
            },
            tx
          );
        }
      } else if (existing.assetId) {
        await this.lifecycle.record(
          {
            assetId: existing.assetId,
            assetCode: existing.assetCode,
            eventType: "updated",
            actor,
            fromStatus: null,
            toStatus: null,
            payload: {
              hardDeleted: true,
              via: "custody_log_deleted",
              logCode: existing.logCode,
              logId: existing.id,
              priorStatus: existing.status,
            },
          },
          tx
        );
      }

      const removed = await this.repo.delete(id, tx);
      if (!removed) throw new NotFoundError("Borrow log", id);
    });
  }

  /** Helper for AssetService.releaseAsset → single custody path. */
  defaultDueDate(): string {
    return dueDatePlusDays(7);
  }
}
