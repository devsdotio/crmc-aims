import type { NextRequest } from "next/server";

import { requireActor, requireAssetOperator } from "@/server/shared/auth";
import { created, handleError, ok } from "@/server/shared/http";

import { VoucherService } from "./voucher.service";

export class VoucherController {
  constructor(
    private readonly service: VoucherService = new VoucherService()
  ) {}

  async list(request: NextRequest | Request) {
    try {
      const actor = await requireActor();
      const url = new URL(request.url);
      const data = await this.service.list(
        {
          search: url.searchParams.get("search") ?? undefined,
          type: url.searchParams.get("type") ?? undefined,
          status: url.searchParams.get("status") ?? undefined,
          startDate: url.searchParams.get("startDate") ?? undefined,
          endDate: url.searchParams.get("endDate") ?? undefined,
          limit: url.searchParams.get("limit") ?? undefined,
          offset: url.searchParams.get("offset") ?? undefined,
        },
        actor.tenantId
      );
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async nextCode(request: NextRequest | Request) {
    try {
      const actor = await requireActor();
      const url = new URL(request.url);
      const type = (url.searchParams.get("type") as "disbursement" | "property_transfer" | "liquidation") ?? "disbursement";
      const voucherCode = await this.service.generateNextVoucherCode(type, undefined, actor.tenantId);
      return ok({ voucherCode });
    } catch (error) {
      return handleError(error);
    }
  }

  async get(id: string) {
    try {
      const actor = await requireActor();
      return ok(await this.service.getById(id, actor.tenantId));
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

export const voucherController = new VoucherController();
export { VoucherService } from "./voucher.service";
export { VoucherRepository } from "./voucher.repository";
export * from "./voucher.types";
export * from "./voucher.validation";
