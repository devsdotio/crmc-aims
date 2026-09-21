import { reportController } from "@/server/modules/reports";

/**
 * @swagger
 * /api/reports/requests:
 *   get:
 *     summary: Requests turnaround and volume report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request volume, turnaround SLA, and fulfillment metrics
 */
export async function GET(request: Request) {
  return reportController.getRequestsReport(request);
}
