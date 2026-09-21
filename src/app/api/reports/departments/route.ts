import { reportController } from "@/server/modules/reports";

/**
 * @swagger
 * /api/reports/departments:
 *   get:
 *     summary: Department reports covering assigned assets, consumables consumed, maintenance, and statistics
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 25
 *     responses:
 *       200:
 *         description: Paginated department report with KPI summary
 */
export async function GET(request: Request) {
  return reportController.getDepartmentsReport(request);
}
