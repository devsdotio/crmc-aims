import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/assets/{id}/report-missing:
 *   post:
 *     summary: Mark a coded asset as missing (lost / stolen / unaccounted)
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason, notes]
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [lost, stolen, missing]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asset marked missing; open custody closed when present
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Asset not found
 *       409:
 *         description: Asset cannot be marked missing
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return assetController.reportMissing(request, id);
}
