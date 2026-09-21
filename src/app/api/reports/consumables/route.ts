import { reportController } from "@/server/modules/reports";

/**
 * @swagger
 * /api/reports/consumables:
 *   get:
 *     summary: Consumables stock and usage report
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
 *           enum: [all, low_stock]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock levels, reorder threshold alerts, and 30/90-day usage velocity
 */
export async function GET(request: Request) {
  return reportController.getConsumablesReport(request);
}
