import type { NextRequest } from "next/server";

import { requireUserManager } from "@/server/shared/auth";
import { created, handleError, noContent, ok } from "@/server/shared/http";

import { ProjectService } from "./project.service";
import { ProjectExpenseService } from "./project-expense.service";
import { ProjectAssetService } from "./project-asset.service";

/**
 * Admin/superadmin project registry + expense ledger + asset custody.
 */
export class ProjectController {
  constructor(
    private readonly service: ProjectService = new ProjectService(),
    private readonly expenses: ProjectExpenseService = new ProjectExpenseService(),
    private readonly projectAssets: ProjectAssetService = new ProjectAssetService()
  ) {}

  async list(request: NextRequest | Request) {
    try {
      const session = await requireUserManager();
      const url = new URL(request.url);
      return ok(
        await this.service.list(
          {
            search: url.searchParams.get("search") ?? undefined,
            status: url.searchParams.get("status") ?? undefined,
          },
          session.actor.tenantId
        )
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async get(id: string) {
    try {
      const session = await requireUserManager();
      return ok(await this.service.getById(id, session.actor.tenantId));
    } catch (error) {
      return handleError(error);
    }
  }

  async create(request: NextRequest | Request) {
    try {
      const session = await requireUserManager();
      const body = await request.json();
      return created(await this.service.create(body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async update(request: NextRequest | Request, id: string) {
    try {
      const session = await requireUserManager();
      const body = await request.json();
      return ok(await this.service.update(id, body, session.actor.tenantId));
    } catch (error) {
      return handleError(error);
    }
  }

  async delete(id: string) {
    try {
      const session = await requireUserManager();
      await this.service.delete(id, session.actor.tenantId);
      return noContent();
    } catch (error) {
      return handleError(error);
    }
  }

  async listExpenses(projectId: string) {
    try {
      const session = await requireUserManager();
      return ok(
        await this.expenses.listForProject(projectId, session.actor.tenantId)
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async createExpense(request: NextRequest | Request, projectId: string) {
    try {
      const session = await requireUserManager();
      const body = await request.json();
      return created(
        await this.expenses.create(projectId, body, session.actor)
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async useConsumable(request: NextRequest | Request, projectId: string) {
    try {
      const session = await requireUserManager();
      const body = await request.json();
      return created(
        await this.expenses.useConsumable(projectId, body, session.actor)
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async updateExpense(
    request: NextRequest | Request,
    projectId: string,
    expenseId: string
  ) {
    try {
      const session = await requireUserManager();
      const body = await request.json();
      return ok(
        await this.expenses.update(projectId, expenseId, body, session.actor)
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async deleteExpense(projectId: string, expenseId: string) {
    try {
      const session = await requireUserManager();
      await this.expenses.delete(projectId, expenseId, session.actor);
      return noContent();
    } catch (error) {
      return handleError(error);
    }
  }

  async listAssets(request: NextRequest | Request, projectId: string) {
    try {
      const session = await requireUserManager();
      const url = new URL(request.url);
      const status = url.searchParams.get("status") ?? undefined;
      return ok(
        await this.projectAssets.list(
          projectId,
          status as "assigned" | "returned" | "written_off" | "all" | undefined,
          session.actor.tenantId
        )
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async assignAsset(request: NextRequest | Request, projectId: string) {
    try {
      const session = await requireUserManager();
      const body = await request.json();
      return created(
        await this.projectAssets.assign(projectId, body, session.actor)
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async returnAsset(
    request: NextRequest | Request,
    projectId: string,
    assignmentId: string
  ) {
    try {
      const session = await requireUserManager();
      let body: unknown = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      return ok(
        await this.projectAssets.returnAsset(
          projectId,
          assignmentId,
          body,
          session.actor
        )
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async reportAssetDamage(
    request: NextRequest | Request,
    projectId: string,
    assignmentId: string
  ) {
    try {
      const session = await requireUserManager();
      const body = await request.json();
      return ok(
        await this.projectAssets.reportDamage(
          projectId,
          assignmentId,
          body,
          session.actor
        )
      );
    } catch (error) {
      return handleError(error);
    }
  }
}

export const projectController = new ProjectController();
export { ProjectService } from "./project.service";
export { ProjectExpenseService } from "./project-expense.service";
export { ProjectAssetService } from "./project-asset.service";
