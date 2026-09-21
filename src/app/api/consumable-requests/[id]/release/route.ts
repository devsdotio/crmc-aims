import { consumableRequestController } from "@/server/modules/consumable-requests";

/**
 * @swagger
 * /api/consumable-requests/{id}/release:
 *   post:
 *     summary: Issue an approved request from specific lots
 *     description: |
 *       Deducts `purchase_lots.quantity_remaining` and `consumables.current_qty`.
 *       Every request line must be included exactly once. Allocations per line
 *       must total the line's quantityRequested. Lot pick is required (no FIFO).
 *     tags: [ConsumableRequests]
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
 *             required: [receivedBy, lines]
 *             properties:
 *               receivedBy: { type: string }
 *               note: { type: string }
 *               lines:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [lineId, allocations]
 *                   properties:
 *                     lineId: { type: string, format: uuid }
 *                     allocations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           lotId: { type: string, format: uuid }
 *                           lotCode: { type: string }
 *                           quantity: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Request released with frozen cost allocations
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return consumableRequestController.release(request, id);
}
