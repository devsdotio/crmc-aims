import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/assets:
 *   get:
 *     summary: List all coded assets
 *     tags: [Assets]
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [active, needs_repair, out_of_service, retired]
 *         description: Filter by current asset status
 *     responses:
 *       200:
 *         description: List of assets
 *       400:
 *         description: Invalid query parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       assetCode:
 *                         type: string
 *                       name:
 *                         type: string
 *                       category:
 *                         type: string
 *                         enum: [transport, computing, av, furniture]
 *                       status:
 *                         type: string
 *                         enum: [active, needs_repair, out_of_service, retired]
 *                       location:
 *                         type: string
 *                       serialNumber:
 *                         type: string
 *                       currentHolder:
 *                         type: string
 *                       department:
 *                         type: string
 *                       purchaseDate:
 *                         type: string
 *                       value:
 *                         type: number
 *                       imageUrl:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       lastUpdated:
 *                         type: string
 *                       maintenanceHistory:
 *                         type: array
 *                         items:
 *                           type: object
 */
export async function GET(request: Request) {
  return assetController.listAssets(request);
}

/**
 * @swagger
 * /api/assets:
 *   post:
 *     summary: Create a new coded asset
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetCode, name, category, location]
 *             properties:
 *               assetCode:
 *                 type: string
 *                 example: AV-031
 *               name:
 *                 type: string
 *                 example: Portable ECG Monitor
 *               category:
 *                 type: string
 *                 enum: [transport, computing, av, furniture]
 *               status:
 *                 type: string
 *                 enum: [active, needs_repair, out_of_service, retired]
 *                 example: active
 *               location:
 *                 type: string
 *                 example: IT Office - Room 302
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
 *     responses:
 *       201:
 *         description: Asset created successfully
 *       400:
 *         description: Invalid payload
 *       409:
 *         description: Duplicate asset code
 */
export async function POST(request: Request) {
  return assetController.createAsset(request);
}
