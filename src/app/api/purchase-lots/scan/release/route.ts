import { purchaseLotController } from "@/server/modules/purchase-lots";

/**
 * @swagger
 * /api/purchase-lots/scan/release:
 *   post:
 *     summary: Release consumable quantity from a scanned supplier lot
 *     description: |
 *       Operator scan / PO "Issue from this lot" flow:
 *       1. Scan lot QR (`CRMC-AIMS-LOT:…`) or pick a PO line lot
 *       2. Enter quantity and exactly one destination (department XOR project)
 *       3. System decreases stock + that lot's remaining quantity
 *       4. History snapshots unit cost, supplier name, lot code
 *       5. Project destinations also create a project expense line
 *
 *       Prefer this over FIFO checkout when multi-supplier / multi-lot pricing matters.
 *       Walk-up issues with `lotId` can also use `POST /api/consumables/{id}/issue`.
 *     tags: [Consumables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               lotId:
 *                 type: string
 *                 format: uuid
 *                 description: Preferred when releasing from a known PO line
 *               code:
 *                 type: string
 *                 example: "CRMC-AIMS-LOT:LOT-2026-ABCD1234"
 *                 description: QR payload or lot code (required when lotId is omitted)
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 5
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *                 description: Required when not issuing to a project
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: Required when not issuing to a department
 *               reason:
 *                 type: string
 *               notes:
 *                 type: string
 *               recipientName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Issue applied from the scanned lot (with project expense when applicable)
 *       400:
 *         description: Insufficient remaining, invalid lot type, or missing destination
 *       404:
 *         description: Lot or consumable not found
 */
export async function POST(request: Request) {
  return purchaseLotController.scanRelease(request);
}
