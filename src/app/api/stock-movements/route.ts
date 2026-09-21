import { stockMovementController } from "@/server/modules/stock-movements";

/**
 * @swagger
 * /api/stock-movements:
 *   get:
 *     summary: List recent consumable stock movements
 *     tags: [Consumables]
 *     parameters:
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [restock, issue, adjust]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 500
 *     responses:
 *       200:
 *         description: Newest-first stock ledger rows with destination and lot
 */
export async function GET(request: Request) {
  return stockMovementController.list(request);
}
