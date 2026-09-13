import { dashboardController } from "@/server/modules/dashboard";

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Dashboard snapshot (counts, pending, overdue, low stock, activity)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [full, sidebar]
 *         description: |
 *           `sidebar` returns only summary counts (for nav badges).
 *           `notifications` returns overdue / pending / low-stock alerts for the header bell.
 *           Default / omitted = full dashboard snapshot widgets.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  if (scope === "sidebar") {
    return dashboardController.sidebarSummary(request);
  }
  if (scope === "notifications") {
    return dashboardController.notifications(request);
  }
  if (scope === "stock-volume") {
    return dashboardController.stockVolume(request);
  }
  if (scope === "assets") {
    return dashboardController.assets(request);
  }
  if (scope === "top-categories") {
    return dashboardController.topCategories(request);
  }
  return dashboardController.snapshot(request);
}
