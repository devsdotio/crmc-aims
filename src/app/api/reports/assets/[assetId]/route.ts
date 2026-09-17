import { reportController } from "@/server/modules/reports";

/**
 * @swagger
 * /api/reports/assets/{assetId}:
 *   get:
 *     summary: Single asset drilldown history
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Full lifecycle history, maintenance, custody, and TCO
 *       404:
 *         description: Asset not found
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await context.params;
  return reportController.getAssetDrilldown(request, assetId);
}
