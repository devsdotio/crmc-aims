import type { NextRequest } from "next/server";

import { requireAssetOperator, requireActor } from "@/server/shared/auth";
import { BadRequestError } from "@/server/shared/errors";
import { created, handleError, ok } from "@/server/shared/http";

import { ConsumableService } from "./consumable.service";

export class ConsumableController {
  constructor(
    private readonly service: ConsumableService = new ConsumableService()
  ) {}

  async list(request: NextRequest | Request) {
    try {
      const session = await requireActor();
      const url = new URL(request.url);
      const { parseIncludeSandbox } = await import("@/server/shared/sandbox");

      const pageParam = url.searchParams.get("page");
      const limitParam = url.searchParams.get("limit");

      return ok(
        await this.service.list(
          {
            category: url.searchParams.get("category") ?? undefined,
            classification: url.searchParams.get("classification") ?? undefined,
            stockLevel: url.searchParams.get("stockLevel") ?? undefined,
            search: url.searchParams.get("search") ?? undefined,
            page: pageParam ? parseInt(pageParam, 10) : undefined,
            limit: limitParam ? parseInt(limitParam, 10) : undefined,
            catalog: url.searchParams.get("catalog") ?? undefined,
            includeSandbox: parseIncludeSandbox(
              url.searchParams.get("includeSandbox"),
              session.role
            ),
          },
          session.tenantId,
          session
        )
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async get(id: string) {
    try {
      const session = await requireActor();
      return ok(await this.service.getById(id, session.tenantId));
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

  async update(request: NextRequest | Request, id: string) {
    try {
      await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.update(id, body));
    } catch (error) {
      return handleError(error);
    }
  }

  async restock(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.restock(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async checkout(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.checkout(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async issue(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      let body: unknown = {};
      try {
        const text = await request.text();
        body = text.trim() ? JSON.parse(text) : {};
      } catch {
        throw new BadRequestError("Invalid JSON body for issue request.");
      }
      return ok(await this.service.issue(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async adjust(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.adjust(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  /** QR scan release from a supplier purchase lot (consumable batch). */
  async releaseFromLot(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.releaseFromLot(body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async delete(id: string) {
    try {
      const session = await requireAssetOperator();
      await this.service.delete(id, session.actor);
      return ok({ success: true });
    } catch (error) {
      return handleError(error);
    }
  }
}

export const consumableController = new ConsumableController();
export { ConsumableService } from "./consumable.service";
