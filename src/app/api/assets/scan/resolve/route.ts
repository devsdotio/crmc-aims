import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/assets/scan/resolve:
 *   post:
 *     summary: Scan QR / code → asset identity + suggested custody action
 *     description: |
 *       Operator scanner entry point. Pass the camera-decoded payload (`CRMC-AIMS:…`)
 *       or bare asset code. Returns whether to release, return, or use project UI.
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "CRMC-AIMS:PRT-310-001"
 *     responses:
 *       200:
 *         description: Resolved unit with suggestedAction
 *       404:
 *         description: Asset not found
 */
export async function POST(request: Request) {
  return assetController.resolveScan(request);
}
