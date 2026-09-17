import type { ProjectProgressIndicatorRow } from "@/server/db/schema";
import type { ActorContext } from "@/server/shared/auth";
import { NotFoundError, ConflictError } from "@/server/shared/errors";
import { serverCache } from "@/server/shared/cache";

import { ProjectProgressRepository } from "./project-progress.repository";
import { ProjectRepository } from "./project.repository";
import type {
  ProjectProgressIndicatorDTO,
  ProjectProgressSummaryDTO,
} from "./project-progress.types";
import {
  createIndicatorSchema,
  indicatorIdSchema,
  toggleIndicatorSchema,
  updateIndicatorSchema,
} from "./project-progress.validation";
import { projectIdSchema } from "./project.validation";

function toDTO(row: ProjectProgressIndicatorRow): ProjectProgressIndicatorDTO {
  return {
    id: row.id,
    projectId: row.projectId,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description ?? null,
    targetDate: row.targetDate ?? null,
    completedDate: row.completedDate ?? null,
    isCompleted: row.isCompleted,
    orderIndex: row.orderIndex,
    completedByUserId: row.completedByUserId ?? null,
    completedByName: row.completedByName ?? null,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class ProjectProgressService {
  constructor(
    private readonly repo = new ProjectProgressRepository(),
    private readonly projectRepo = new ProjectRepository()
  ) {}

  private async requireProject(projectId: string, tenantId: string) {
    const project = await this.projectRepo.findById(projectId, undefined, tenantId);
    if (!project) throw new NotFoundError("Project", projectId);
    return project;
  }

  async getProgressSummary(
    rawProjectId: string,
    actor: ActorContext
  ): Promise<ProjectProgressSummaryDTO> {
    const projectId = projectIdSchema.parse(rawProjectId);
    await this.requireProject(projectId, actor.tenantId);

    const rows = await this.repo.listByProject(projectId, undefined, actor.tenantId);
    const indicators = rows.map(toDTO);
    const totalIndicators = indicators.length;
    const completedIndicators = indicators.filter((i) => i.isCompleted).length;
    const pendingIndicators = totalIndicators - completedIndicators;
    const progressPercentage =
      totalIndicators > 0
        ? Math.round((completedIndicators / totalIndicators) * 100)
        : 0;

    return {
      totalIndicators,
      completedIndicators,
      pendingIndicators,
      progressPercentage,
      indicators,
    };
  }

  async createIndicator(
    rawProjectId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ProjectProgressIndicatorDTO> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const project = await this.requireProject(projectId, actor.tenantId);
    if (project.status === "completed") {
      throw new ConflictError("Cannot modify indicators of a completed project.");
    }

    const input = createIndicatorSchema.parse(rawInput);

    const row = await this.repo.create({
      tenantId: actor.tenantId,
      projectId,
      title: input.title,
      description: input.description ?? null,
      targetDate: input.targetDate ?? null,
      orderIndex: input.orderIndex ?? 0,
      createdByUserId: actor.userId,
      createdByName: actor.displayName,
    });

    serverCache.invalidateTags([
      "projects",
      "dashboard",
      `tenant:${actor.tenantId}:projects`,
      `tenant:${actor.tenantId}:dashboard`,
    ]);
    return toDTO(row);
  }

  async updateIndicator(
    rawProjectId: string,
    rawIndicatorId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ProjectProgressIndicatorDTO> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const indicatorId = indicatorIdSchema.parse(rawIndicatorId);
    const project = await this.requireProject(projectId, actor.tenantId);
    if (project.status === "completed") {
      throw new ConflictError("Cannot modify indicators of a completed project.");
    }

    const existing = await this.repo.findById(indicatorId, undefined, actor.tenantId);
    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundError("Project progress indicator", indicatorId);
    }

    const input = updateIndicatorSchema.parse(rawInput);

    const updateData: Partial<typeof existing> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.targetDate !== undefined) updateData.targetDate = input.targetDate;
    if (input.orderIndex !== undefined) updateData.orderIndex = input.orderIndex;

    if (input.isCompleted !== undefined) {
      updateData.isCompleted = input.isCompleted;
      if (input.isCompleted) {
        updateData.completedDate = new Date().toISOString().slice(0, 10);
        updateData.completedByUserId = actor.userId;
        updateData.completedByName = actor.displayName;
      } else {
        updateData.completedDate = null;
        updateData.completedByUserId = null;
        updateData.completedByName = null;
      }
    }

    const updated = await this.repo.update(
      indicatorId,
      updateData,
      undefined,
      actor.tenantId
    );
    if (!updated) {
      throw new NotFoundError("Project progress indicator", indicatorId);
    }

    serverCache.invalidateTags([
      "projects",
      "dashboard",
      `tenant:${actor.tenantId}:projects`,
      `tenant:${actor.tenantId}:dashboard`,
    ]);
    return toDTO(updated);
  }

  async toggleCompletion(
    rawProjectId: string,
    rawIndicatorId: string,
    rawInput: unknown,
    actor: ActorContext
  ): Promise<ProjectProgressIndicatorDTO> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const indicatorId = indicatorIdSchema.parse(rawIndicatorId);
    await this.requireProject(projectId, actor.tenantId);

    const existing = await this.repo.findById(indicatorId, undefined, actor.tenantId);
    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundError("Project progress indicator", indicatorId);
    }

    const input = toggleIndicatorSchema.parse(rawInput);
    const completedDate = input.isCompleted
      ? new Date().toISOString().slice(0, 10)
      : null;

    const updated = await this.repo.update(
      indicatorId,
      {
        isCompleted: input.isCompleted,
        completedDate,
        completedByUserId: input.isCompleted ? actor.userId : null,
        completedByName: input.isCompleted ? actor.displayName : null,
      },
      undefined,
      actor.tenantId
    );

    if (!updated) {
      throw new NotFoundError("Project progress indicator", indicatorId);
    }

    serverCache.invalidateTags([
      "projects",
      "dashboard",
      `tenant:${actor.tenantId}:projects`,
      `tenant:${actor.tenantId}:dashboard`,
    ]);
    return toDTO(updated);
  }

  async deleteIndicator(
    rawProjectId: string,
    rawIndicatorId: string,
    actor: ActorContext
  ): Promise<void> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const indicatorId = indicatorIdSchema.parse(rawIndicatorId);
    const project = await this.requireProject(projectId, actor.tenantId);
    if (project.status === "completed") {
      throw new ConflictError("Cannot modify indicators of a completed project.");
    }

    const existing = await this.repo.findById(indicatorId, undefined, actor.tenantId);
    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundError("Project progress indicator", indicatorId);
    }

    await this.repo.delete(indicatorId, undefined, actor.tenantId);
    serverCache.invalidateTags([
      "projects",
      "dashboard",
      `tenant:${actor.tenantId}:projects`,
      `tenant:${actor.tenantId}:dashboard`,
    ]);
  }
}
