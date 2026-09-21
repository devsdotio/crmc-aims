import { consumableRequestController } from "@/server/modules/consumable-requests";

/**
 * @swagger
 * /api/consumable-requests/{id}/cancel:
 *   post:
 *     summary: Cancel a pending consumable request (requester or operator)
 *     tags: [ConsumableRequests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note: { type: string }
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return consumableRequestController.cancel(request, id);
}
