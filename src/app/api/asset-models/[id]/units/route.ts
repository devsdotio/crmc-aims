import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/asset-models/{id}/units:
 *   get:
 *     summary: List physical units under a model
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
 *         description: Units (each with unique QR)
 *   post:
 *     summary: Register more physical units under a model
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
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 example: 10
 *               codePrefix:
 *                 type: string
 *               location:
 *                 type: string
 *               unitValue:
 *                 type: number
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Units created
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return assetController.listModelUnits(id);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return assetController.registerModelUnits(request, id);
}
