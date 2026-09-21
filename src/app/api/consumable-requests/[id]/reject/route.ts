import { consumableRequestController } from "@/server/modules/consumable-requests";

/**
 * @swagger
 * /api/consumable-requests/{id}/reject:
 *   post:
 *     summary: Reject a pending consumable request
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return consumableRequestController.reject(request, id);
}
