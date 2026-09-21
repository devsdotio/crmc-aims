import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/assets/next-code:
 *   get:
 *     summary: Preview the next unique asset code for a category
 *     tags: [Assets]
 *     parameters:
 *       - in: query
 *         name: category
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Suggested next asset code
 */
export async function GET(request: Request) {
  return assetController.peekNextAssetCode(request);
}
