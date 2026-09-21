import { borrowRequestController } from "@/server/modules/borrow-requests";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/borrow-requests/{id}/unrelease:
 *   post:
 *     summary: Mark an approved request as unreleased (pickup did not happen)
 *     tags: [BorrowRequests]
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
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return borrowRequestController.markUnreleased(request, id);
}
