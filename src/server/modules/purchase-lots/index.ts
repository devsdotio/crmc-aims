import type { NextRequest } from "next/server";

import { requireActor, requireAssetOperator } from "@/server/shared/auth";
import { handleError, ok } from "@/server/shared/http";
import { ConsumableService } from "@/server/modules/consumables/consumable.service";

import { PurchaseLotService } from "./purchase-lot.service";

export class PurchaseLotController {
  constructor(
    private readonly service: PurchaseLotService = new PurchaseLotService(),
    private readonly consumables: ConsumableService = new ConsumableService()
  ) {}

  async list(request: NextRequest | Request) {
    try {
      const actor = await requireActor();
      const url = new URL(request.url);
      const { parseIncludeSandbox } = await import("@/server/shared/sandbox");
      const consumableId = url.searchParams.get("consumableId") ?? undefined;
      const consumableIdsRaw = url.searchParams.getAll("consumableIds");
      const consumableIds =
        consumableIdsRaw.length > 0
          ? consumableIdsRaw.flatMap((value) =>
              value
                .split(",")
                .map((id) => id.trim())
                .filter(Boolean)
            )
          : undefined;
      const ensureIds = [
        ...new Set([
          ...(consumableId ? [consumableId] : []),
          ...(consumableIds ?? []),
        ]),
      ];
      for (const id of ensureIds) {
        await this.consumables.ensureOpeningLotIfMissing(id, actor);
      }
      return ok(
        await this.service.list(
          {
            consumableId,
            consumableIds,
            assetId: url.searchParams.get("assetId") ?? undefined,
            supplierId: url.searchParams.get("supplierId") ?? undefined,
            itemType:
              (url.searchParams.get("itemType") as
                | "consumable"
                | "asset"
                | null) ?? undefined,
            status:
              (url.searchParams.get("status") as
                | "pending_approval"
                | "approved"
                | "ordered"
                | "delivered"
                | "cancelled"
                | null) ?? undefined,
            statuses: (() => {
              const parts = url.searchParams
                .getAll("statuses")
                .flatMap((v) => v.split(","))
                .map((s) => s.trim())
                .filter(Boolean);
              return parts.length > 0 ? parts : undefined;
            })(),
            limit: url.searchParams.get("limit") ?? undefined,
            search: url.searchParams.get("search") ?? undefined,
            includeSandbox: parseIncludeSandbox(
              url.searchParams.get("includeSandbox"),
              actor.role
            ),
          },
          actor.tenantId
        )
      );
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

  async getByCode(request: NextRequest | Request) {
    try {
      const actor = await requireActor();
      const url = new URL(request.url);
      const code = url.searchParams.get("code") ?? "";
      return ok(await this.service.getByCode(code, actor.tenantId));
    } catch (error) {
      return handleError(error);
    }
  }

  async create(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      const result = await this.service.createPurchaseOrder(body, session.actor);
      return ok(result);
    } catch (error) {
      return handleError(error);
    }
  }

  async updateStatus(id: string, request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      const result = await this.service.updatePOStatus(id, body, session.actor);
      return ok(result);
    } catch (error) {
      return handleError(error);
    }
  }

  async update(id: string, request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      const result = await this.service.updatePurchaseOrder(id, body, session.actor);
      return ok(result);
    } catch (error) {
      return handleError(error);
    }
  }

  async delete(id: string) {
    try {
      const session = await requireAssetOperator();
      const result = await this.service.deletePurchaseOrder(id, session.actor);
      return ok({ success: result });
    } catch (error) {
      return handleError(error);
    }
  }

  /** TEMPORARY: preview force-delete impact for a whole PO. */
  async deleteImpact(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const url = new URL(request.url);
      const poNumber = url.searchParams.get("poNumber") ?? "";
      return ok(
        await this.service.previewDeleteByPoNumber(
          poNumber,
          session.actor.tenantId
        )
      );
    } catch (error) {
      return handleError(error);
    }
  }

  /** TEMPORARY: atomic delete-by-PO with inventory revert. */
  async deleteByPo(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const url = new URL(request.url);
      const poNumber = url.searchParams.get("poNumber") ?? "";
      const impact = await this.service.deleteByPoNumberWithRevert(
        poNumber,
        session.actor
      );
      return ok({ success: true, impact });
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Scan lot QR → enter qty → cost-snapshot checkout on the linked consumable.
   * Delegates to ConsumableService so stock + history stay in one place.
   */
  async scanRelease(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return ok(
        await this.consumables.releaseFromLot(body, session.actor)
      );
    } catch (error) {
      return handleError(error);
    }
  }
}

export const purchaseLotController = new PurchaseLotController();
export { PurchaseLotService } from "./purchase-lot.service";
export type { LotCostAllocation } from "./purchase-lot.service";
export { PurchaseLotRepository } from "./purchase-lot.repository";
export { toPurchaseLotDTO } from "./purchase-lot.service";
export type {
  PoDeleteImpact,
  PoDeleteLineEffect,
  PoDeleteBlocker,
} from "./purchase-lot.types";
