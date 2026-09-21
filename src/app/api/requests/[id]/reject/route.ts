import { borrowRequestController } from "@/server/modules/borrow-requests";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/borrow-requests/{id}/reject:
 *   post:
 *     summary: Reject a pending borrow request
 *     tags: [BorrowRequests]
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
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return borrowRequestController.reject(request, id);
}
