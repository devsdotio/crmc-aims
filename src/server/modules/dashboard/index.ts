import { requireActor } from "@/server/shared/auth";
import { isAssetOperatorRole } from "@/server/shared/roles";
import { handleError, ok, okWithEtag } from "@/server/shared/http";

import { DashboardService } from "./dashboard.service";

export class DashboardController {
  constructor(private readonly service = new DashboardService()) {}

  async snapshot(request?: Request) {
    try {
      const session = await requireActor();
      const tenantId = session.tenantId;
      const data = isAssetOperatorRole(session.role)
        ? await this.service.getSnapshot(5, tenantId)
        : await this.service.getBorrowerSnapshot(session.userId, 5, tenantId);
      if (request) {
        return okWithEtag(request, data, {
          cacheControl: { maxAge: 15, staleWhileRevalidate: 60 },
        });
      }
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  /** Nav badges — 4 COUNTs max, not the full dashboard widgets. */
  async sidebarSummary(request?: Request) {
    try {
      const session = await requireActor();
      const tenantId = session.tenantId;
      const data = isAssetOperatorRole(session.role)
        ? await this.service.getSidebarSummary(undefined, tenantId)
        : await this.service.getSidebarSummary(session.userId, tenantId);
      if (request) {
        return okWithEtag(request, data, {
          cacheControl: { maxAge: 15, staleWhileRevalidate: 60 },
        });
      }
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  /** Header notification bell — overdue, pending, low stock. */
  async notifications(request?: Request) {
    try {
      const session = await requireActor();
      const tenantId = session.tenantId;
      const data = isAssetOperatorRole(session.role)
        ? await this.service.getNotifications(undefined, 8, tenantId)
        : await this.service.getNotifications(session.userId, 8, tenantId);
      if (request) {
        return okWithEtag(request, data, {
          cacheControl: { maxAge: 15, staleWhileRevalidate: 60 },
        });
      }
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  /** Stock volume inflow vs outflow time-series bucketed by timeframe and category. */
  async stockVolume(request: Request) {
    try {
      const session = await requireActor();
      const tenantId = session.tenantId;
      const url = new URL(request.url);
      const timeframe = (url.searchParams.get("timeframe") ?? "monthly") as
        | "weekly"
        | "monthly"
        | "yearly";
      const category = url.searchParams.get("category") ?? undefined;

      const data = await this.service.getStockVolumeVsConsumeRate({
        timeframe: ["weekly", "monthly", "yearly"].includes(timeframe)
          ? timeframe
          : "monthly",
        category,
      }, "all", tenantId);

      return okWithEtag(request, data, {
        cacheControl: { maxAge: 30, staleWhileRevalidate: 60 },
      });
    } catch (error) {
      return handleError(error);
    }
  }

  /** Dashboard asset rows with custody precedence, condition status, and valuation. */
  async assets(request: Request) {
    try {
      const session = await requireActor();
      const tenantId = session.tenantId;
      const url = new URL(request.url);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(url.searchParams.get("limit") ?? "5", 10) || 5)
      );
      const search = url.searchParams.get("search") ?? undefined;
      const tag = url.searchParams.get("tag") ?? undefined;

      const data = await this.service.getDashboardAssetRows({
        limit,
        search,
        tag,
        tenantId,
      }, tenantId);

      if (request) {
        return okWithEtag(request, data, {
          cacheControl: { maxAge: 30, staleWhileRevalidate: 60 },
        });
      }

      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  /** Combined asset and consumable category distribution. */
  async topCategories(request: Request) {
    try {
      const session = await requireActor();
      const tenantId = session.tenantId;
      const url = new URL(request.url);
      const limit = Math.min(
        20,
        Math.max(1, parseInt(url.searchParams.get("limit") ?? "5", 10) || 5)
      );
      const source = (url.searchParams.get("source") ?? "all") as
        | "all"
        | "assets"
        | "consumables";

      const data = await this.service.getCombinedCategoryDistribution(
        limit,
        ["all", "assets", "consumables"].includes(source) ? source : "all",
        tenantId
      );

      return okWithEtag(request, data, {
        cacheControl: { maxAge: 30, staleWhileRevalidate: 60 },
      });
    } catch (error) {
      return handleError(error);
    }
  }
}

export const dashboardController = new DashboardController();
export { DashboardService, invalidateDashboardCache } from "./dashboard.service";
export type {
  DashboardNotificationItem,
  DashboardSnapshotDTO,
  DashboardSummaryDTO,
  DashboardPendingRequest,
  DashboardOverdueAsset,
  DashboardLowStockItem,
  DashboardAssetRowDTO,
  StockVolumePointDTO,
  StockVolumeResponseDTO,
  DashboardCategoryCount,
  StatDeltaDTO,
} from "./dashboard.service";
