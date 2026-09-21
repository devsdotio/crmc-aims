import { consumableController } from "@/server/modules/consumables";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/consumables/{id}/adjust:
 *   post:
 *     summary: Lot-synced stock adjustment (manual correction)
 *     description: |
 *       Decrease requires lot allocations. Increase requires attachLotId/Code
 *       or createCorrectionLot=true so item totals and lot remainders stay aligned.
 *     tags: [Consumables]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantityChange, reason]
 *             properties:
 *               quantityChange: { type: integer }
 *               reason: { type: string }
 *               notes: { type: string }
 *               allocations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     lotId: { type: string, format: uuid }
 *                     lotCode: { type: string }
 *                     quantity: { type: integer }
 *               attachLotId: { type: string, format: uuid }
 *               attachLotCode: { type: string }
 *               createCorrectionLot: { type: boolean }
 *               unitCost: { type: string }
 *               supplierId: { type: string, format: uuid }
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return consumableController.adjust(request, id);
}
