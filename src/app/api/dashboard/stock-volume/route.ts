import { dashboardController } from "@/server/modules/dashboard";

/**
 * @swagger
 * /api/dashboard/stock-volume:
 *   get:
 *     summary: Inflow vs Outflow stock volume data points
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, yearly]
 *         description: Time aggregation bucket
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category filter ("all" or specific category)
 */
export async function GET(request: Request) {
  return dashboardController.stockVolume(request);
}
