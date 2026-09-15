import { reportController } from "@/server/modules/reports";

/**
 * @swagger
 * /api/reports/projects:
 *   get:
 *     summary: Project reports covering assigned assets, consumed stocks, and costs
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
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
 *         description: Paginated project report with KPI summary
 */
export async function GET(request: Request) {
  return reportController.getProjectsReport(request);
}
