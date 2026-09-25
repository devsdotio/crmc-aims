import type { NextRequest } from "next/server";

import { requireAssetOperator, requireActor, requireRoles } from "@/server/shared/auth";
import { created, handleError, noContent, ok } from "@/server/shared/http";

import { BorrowLogService } from "./borrow-log.service";

export class BorrowLogController {
  constructor(private readonly service: BorrowLogService = new BorrowLogService()) {}

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
            custodyKind:
              url.searchParams.get("custodyKind") ||
              url.searchParams.get("custody") ||
              url.searchParams.get("type") ||
              undefined,
            scope:
              url.searchParams.get("scope") === "department"
                ? "department"
                : undefined,
            page: url.searchParams.get("page") ?? undefined,
            limit: url.searchParams.get("limit") ?? undefined,
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

  async release(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return created(await this.service.release(body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async returnLog(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(await this.service.returnLog(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async voidLog(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json().catch(() => ({}));
      return ok(await this.service.voidLog(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async hardDelete(_request: NextRequest | Request, id: string) {
    try {
      const session = await requireRoles("superadmin");
      await this.service.hardDelete(id, session.actor);
      return noContent();
    } catch (error) {
      return handleError(error);
    }
  }
}

export const borrowLogController = new BorrowLogController();
export { BorrowLogService } from "./borrow-log.service";
