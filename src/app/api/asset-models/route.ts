import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/asset-models:
 *   get:
 *     summary: List product models (multi-unit catalog)
 *     tags: [Assets]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asset models with unit counts
 *   post:
 *     summary: Create a product model (no units yet)
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [modelCode, name, category]
 *             properties:
 *               modelCode:
 *                 type: string
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               defaultLocation:
 *                 type: string
 *               defaultUnitValue:
 *                 type: number
 *               defaultAssignmentType:
 *                 type: string
 *                 enum: [borrowable, assignable]
 *     responses:
 *       201:
 *         description: Model created
 *       409:
 *         description: modelCode conflict
 */
export async function GET(request: Request) {
  return assetController.listModels(request);
}

export async function POST(request: Request) {
  return assetController.createModel(request);
}
