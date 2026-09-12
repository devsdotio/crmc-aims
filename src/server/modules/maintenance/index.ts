import type { NextRequest } from "next/server";

import { requireActor, requireAssetOperator } from "@/server/shared/auth";
import { created, handleError, ok } from "@/server/shared/http";

import { MaintenanceLogService } from "./maintenance.service";

export class MaintenanceController {
  constructor(
    private readonly service: MaintenanceLogService = new MaintenanceLogService()
  ) {}

  async list(request: NextRequest | Request) {
    try {
      const session = await requireActor();
      const url = new URL(request.url);
      const { parseIncludeSandbox } = await import("@/server/shared/sandbox");
      return ok(
        await this.service.list(
          {
            openOnly: url.searchParams.get("openOnly") ?? undefined,
            search: url.searchParams.get("search") ?? undefined,
            condition: url.searchParams.get("condition") ?? undefined,
            includeSandbox: parseIncludeSandbox(
              url.searchParams.get("includeSandbox"),
              session.role
            ),
          },
          session.actor
        )
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async get(id: string) {
    try {
      await requireActor();
      return ok(await this.service.getById(id));
    } catch (error) {
      return handleError(error);
    }
  }

  async create(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return created(await this.service.create(body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async resolve(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.resolve(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }
}

export const maintenanceController = new MaintenanceController();
export { MaintenanceLogService } from "./maintenance.service";
