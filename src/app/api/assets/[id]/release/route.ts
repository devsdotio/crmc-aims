import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/assets/{id}/release:
 *   post:
 *     summary: Release a coded asset to a borrower
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
 *               custodyKind:
 *                 type: string
 *                 enum: [borrow, assignment]
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               borrowerName:
 *                 type: string
 *               notes:
 *                 type: string
 *               expectedReturnDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Asset released; lifecycle event recorded with operator actor
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Asset not found
 *       409:
 *         description: Asset is not available for release
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return assetController.releaseAsset(request, id);
}
