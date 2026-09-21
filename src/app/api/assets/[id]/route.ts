import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/assets/{id}:
 *   get:
 *     summary: Get a coded asset by id
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Asset details
 *       404:
 *         description: Asset not found
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return assetController.getAsset(id);
}

/**
 * @swagger
 * /api/assets/{id}:
 *   patch:
 *     summary: Update a coded asset
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
 *             properties:
 *               assetCode:
 *                 type: string
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [transport, computing, av, furniture]
 *               location:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               currentHolder:
 *                 type: string
 *               department:
 *                 type: string
 *               purchaseDate:
 *                 type: string
 *               value:
 *                 type: number
 *               imageUrl:
 *                 type: string
 *               notes:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, needs_repair, out_of_service, retired]
 *     responses:
 *       200:
 *         description: Asset updated successfully
 *       400:
 *         description: Invalid payload
 *       404:
 *         description: Asset not found
 *       409:
 *         description: Duplicate asset code
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return assetController.updateAsset(request, id);
}

/**
 * @swagger
 * /api/assets/{id}:
 *   delete:
 *     summary: Delete a coded asset
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Asset deleted successfully
 *       404:
 *         description: Asset not found
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return assetController.deleteAsset(id);
}
