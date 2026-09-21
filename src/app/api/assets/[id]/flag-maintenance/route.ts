import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/assets/{id}/flag-maintenance:
 *   post:
 *     summary: Flag a coded asset for maintenance
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asset flagged; lifecycle and status events recorded
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Asset not found
 *       409:
 *         description: Asset cannot be flagged
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return assetController.flagForMaintenance(request, id);
}
