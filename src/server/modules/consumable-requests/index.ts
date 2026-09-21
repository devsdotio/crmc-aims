import type { NextRequest } from "next/server";

import { requireActor, requireAssetOperator } from "@/server/shared/auth";
import { created, handleError, ok } from "@/server/shared/http";

import { ConsumableRequestService } from "./consumable-request.service";

export class ConsumableRequestController {
  constructor(
    private readonly service: ConsumableRequestService = new ConsumableRequestService()
  ) {}

  async list(request: NextRequest | Request) {
    try {
      const actor = await requireActor();
      const url = new URL(request.url);
      const { parseIncludeSandbox } = await import("@/server/shared/sandbox");
      return ok(
        await this.service.list(
          {
            status: url.searchParams.get("status") ?? undefined,
            department: url.searchParams.get("department") ?? undefined,
            search: url.searchParams.get("search") ?? undefined,
            startDate: url.searchParams.get("startDate") ?? undefined,
            endDate: url.searchParams.get("endDate") ?? undefined,
            page: url.searchParams.has("page")
              ? Number(url.searchParams.get("page"))
              : undefined,
            limit: url.searchParams.has("limit")
              ? Number(url.searchParams.get("limit"))
              : undefined,
            includeSandbox: parseIncludeSandbox(
              url.searchParams.get("includeSandbox"),
              actor.role
            ),
          },
          actor
        )
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async get(id: string) {
    try {
      const actor = await requireActor();
      return ok(await this.service.getById(id, actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async create(request: NextRequest | Request) {
    try {
      const actor = await requireActor();
      const body = await request.json();
      return created(await this.service.create(body, actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async approve(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      let body: unknown = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      return ok(await this.service.approve(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async undoApproval(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      let body: unknown = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      return ok(await this.service.undoApproval(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async reject(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.reject(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async cancel(request: NextRequest | Request, id: string) {
    try {
      const actor = await requireActor();
      let body: unknown = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      return ok(await this.service.cancel(id, body, actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async release(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.release(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async update(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.update(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }
}

export const consumableRequestController = new ConsumableRequestController();
export { ConsumableRequestService } from "./consumable-request.service";
