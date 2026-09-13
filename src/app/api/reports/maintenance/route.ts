import { reportController } from "@/server/modules/reports";

/**
 * @swagger
 * /api/reports/maintenance:
 *   get:
 *     summary: Maintenance and repairs analytics report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, open, resolved]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Work orders, MTTR, repair costs, and frequent-fault assets
 */
export async function GET(request: Request) {
  return reportController.getMaintenanceReport(request);
}
