import { purchaseLotController } from "@/server/modules/purchase-lots";

/**
 * @swagger
 * /api/purchase-lots/by-code:
 *   get:
 *     summary: Look up a purchase lot by lot code or QR payload
 *     description: |
 *       QR format: `CRMC-AIMS-LOT:{lotCode}`.
 *       Lots are the scannable unit for multi-supplier consumable stock
 *       (e.g. 10 reams of A4 from Supplier A at one unit cost).
 *     tags: [Consumables]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase lot with frozen unit cost + supplier snapshot
 *       404:
 *         description: Lot not found
 */
export async function GET(request: Request) {
  return purchaseLotController.getByCode(request);
}
