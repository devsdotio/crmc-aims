export { StockMovementRepository } from "./stock-movement.repository";
export { StockMovementService } from "./stock-movement.service";
export type {
  RecordMovementLine,
  RecordStockMovementsInput,
  StockMovementDirection,
  StockMovementDTO,
  StockMovementReason,
} from "./stock-movement.service";
export { allocationsToMovementLines } from "./stock-movement.service";

import type { NextRequest } from "next/server";

import { requireActor, requireAssetOperator } from "@/server/shared/auth";
import { handleError, ok } from "@/server/shared/http";

import { StockMovementService } from "./stock-movement.service";

export class StockMovementController {
  constructor(
    private readonly service: StockMovementService = new StockMovementService()
  ) {}

  async list(request: NextRequest | Request) {
    try {
      const actor = await requireActor();
      const url = new URL(request.url);
      const { parseIncludeSandbox } = await import("@/server/shared/sandbox");
      return ok(
        await this.service.list(
          {
            reason: url.searchParams.get("reason") ?? undefined,
            limit: url.searchParams.get("limit") ?? undefined,
            // Client departmentId is ignored for borrowers inside the service.
            departmentId: url.searchParams.get("departmentId") ?? undefined,
            classification: url.searchParams.get("classification") ?? undefined,
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

  async listByConsumable(id: string) {
    try {
      const actor = await requireActor();
      return ok(await this.service.listByConsumable(id, actor.tenantId));
    } catch (error) {
      return handleError(error);
    }
  }

  async voidIssue(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json().catch(() => ({}));
      return ok(await this.service.voidIssue(id, body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }
}

export const stockMovementController = new StockMovementController();
