import { consumableRequestController } from "@/server/modules/consumable-requests";

/**
 * @swagger
 * /api/consumable-requests/{id}/undo-approval:
 *   post:
 *     summary: Revert an approved consumable request back to pending review
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
  return consumableRequestController.undoApproval(request, id);
}
