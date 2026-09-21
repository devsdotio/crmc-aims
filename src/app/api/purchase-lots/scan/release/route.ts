import { purchaseLotController } from "@/server/modules/purchase-lots";

/**
 * @swagger
 * /api/purchase-lots/scan/release:
 *   post:
 *     summary: Release consumable quantity from a scanned supplier lot
 *     description: |
 *       Operator scan flow:
 *       1. Scan lot QR (`CRMC-AIMS-LOT:…`)
 *       2. Enter quantity
 *       3. System decreases stock + lot remaining
 *       4. History snapshots unit cost, supplier name, lot code (immutable for reports)
 *
 *       Prefer this over generic checkout when multi-supplier pricing matters.
 *       Prefer `POST /api/consumables/{id}/issue` for walk-up issues with a destination.
 *     tags: [Consumables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, quantity]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "CRMC-AIMS-LOT:LOT-2026-ABCD1234"
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 5
 *               reason:
 *                 type: string
 *               notes:
 *                 type: string
 *               recipientName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout applied with cost snapshot
 *       400:
 *         description: Insufficient remaining or invalid lot type
 *       404:
 *         description: Lot or consumable not found
 */
export async function POST(request: Request) {
  return purchaseLotController.scanRelease(request);
}
