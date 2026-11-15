import { reportController } from "@/server/modules/reports";

/**
 * @swagger
 * /api/reports/export:
 *   get:
 *     summary: Export report data to CSV
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: reportType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [executive, assets, consumables, purchase-orders, requests, maintenance, projects, departments]
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv]
 *           default: csv
 *     responses:
 *       200:
 *         description: Streamed CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
export async function GET(request: Request) {
  return reportController.exportReport(request);
}
