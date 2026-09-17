import { reportController } from "@/server/modules/reports";

/**
 * @swagger
 * /api/reports/purchase-orders:
 *   get:
 *     summary: Purchase orders procurement report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: category
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
 *     responses:
 *       200:
 *         description: PO records, procurement spend, and lead time metrics
 */
export async function GET(request: Request) {
  return reportController.getPurchaseOrdersReport(request);
}
