import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/assets/by-code:
 *   get:
 *     summary: Look up a unit by asset code or QR payload
 *     tags: [Assets]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Bare asset code or `CRMC-AIMS:{code}` QR value
 *     responses:
 *       200:
 *         description: Asset unit
 *       404:
 *         description: Not found
 */
export async function GET(request: Request) {
  return assetController.getByCode(request);
}
