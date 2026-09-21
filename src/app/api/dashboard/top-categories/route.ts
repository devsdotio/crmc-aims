import { dashboardController } from "@/server/modules/dashboard";

/**
 * @swagger
 * /api/dashboard/top-categories:
 *   get:
 *     summary: Combined category distribution (assets + consumables)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [all, assets, consumables]
 *           default: all
 */
export async function GET(request: Request) {
  return dashboardController.topCategories(request);
}
