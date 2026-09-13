import { dashboardController } from "@/server/modules/dashboard";

/**
 * @swagger
 * /api/dashboard/assets:
 *   get:
 *     summary: Live asset inventory rows for dashboard table card
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 */
export async function GET(request: Request) {
  return dashboardController.assets(request);
}
