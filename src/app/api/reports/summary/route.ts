import { reportController } from "@/server/modules/reports";

/**
 * @swagger
 * /api/reports/summary:
 *   get:
 *     summary: Executive report dashboard rollups
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Consolidated KPIs across assets, consumables, procurement, requests, and maintenance
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires staff, admin, or superadmin
 */
export async function GET(request: Request) {
  return reportController.getSummary(request);
}
