import type { NextRequest } from "next/server";

import { requireActor, requireAssetOperator } from "@/server/shared/auth";
import { created, handleError, ok } from "@/server/shared/http";

import { PettyCashService } from "./petty-cash.service";

export class PettyCashController {
  constructor(
    private readonly service: PettyCashService = new PettyCashService()
  ) {}

  async list(request: NextRequest | Request) {
    try {
      await requireActor();
      const url = new URL(request.url);
      const data = await this.service.list({
        search: url.searchParams.get("search") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        category: url.searchParams.get("category") ?? undefined,
        departmentId: url.searchParams.get("departmentId") ?? undefined,
        startDate: url.searchParams.get("startDate") ?? undefined,
        endDate: url.searchParams.get("endDate") ?? undefined,
        limit: url.searchParams.get("limit") ?? undefined,
        offset: url.searchParams.get("offset") ?? undefined,
      });
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async nextCode() {
    try {
      await requireActor();
      const pcvNumber = await this.service.generateNextPcvCode();
      return ok({ pcvNumber });
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

  async update(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.update(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async updateStatus(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.updateStatus(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async delete(id: string) {
    try {
      const session = await requireAssetOperator();
      return ok(await this.service.delete(id, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }
}

export const pettyCashController = new PettyCashController();
export { PettyCashService } from "./petty-cash.service";
export { PettyCashRepository } from "./petty-cash.repository";
export * from "./petty-cash.types";
export * from "./petty-cash.validation";
