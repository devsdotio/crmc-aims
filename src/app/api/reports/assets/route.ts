import { reportController } from "@/server/modules/reports";

/**
 * @swagger
 * /api/reports/assets:
 *   get:
 *     summary: Asset register report
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
 *       - in: query
 *         name: search
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
 *         description: Paginated asset register with KPI summary
 */
export async function GET(request: Request) {
  return reportController.getAssetsReport(request);
}
