import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/assets/{id}/lifecycle:
 *   get:
 *     summary: List lifecycle / accountability events for a coded asset
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           maximum: 500
 *     responses:
 *       200:
 *         description: Newest-first lifecycle events (append-only audit trail)
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Asset not found
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return assetController.listLifecycle(request, id);
}
