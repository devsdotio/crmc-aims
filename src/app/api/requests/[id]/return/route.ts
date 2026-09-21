import { borrowRequestController } from "@/server/modules/borrow-requests";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/borrow-requests/{id}/return:
 *   post:
 *     summary: Mark a released borrow request as returned (closes borrow log)
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
 *             required: [returnedBy]
 *             properties:
 *               returnedBy: { type: string }
 *               note: { type: string }
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return borrowRequestController.markReturned(request, id);
}
