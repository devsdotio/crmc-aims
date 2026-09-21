import { stockMovementController } from "@/server/modules/stock-movements";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/consumables/{id}/movements:
 *   get:
 *     summary: Stock in/out ledger for one consumable
 *     tags: [Consumables]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Newest-first movements with destination, lot, and cost
 *       404:
 *         description: Consumable not found
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return stockMovementController.listByConsumable(id);
}
