import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/assets/scan/return:
 *   post:
 *     summary: Receive / return an asset after scanning its QR
 *     description: |
 *       Same custody rules as `POST /api/assets/{id}/return`, identified by
 *       QR payload / asset code for operator scanners.
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, condition]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "CRMC-AIMS:PRT-310-001"
 *               condition:
 *                 type: string
 *                 example: good
 *               status:
 *                 type: string
 *                 enum: [active, needs_repair, out_of_service, retired]
 *               flagMaintenance:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Asset returned
 *       404:
 *         description: Asset not found
 *       409:
 *         description: No active borrow log / project custody
 */
export async function POST(request: Request) {
  return assetController.scanReturn(request);
}
