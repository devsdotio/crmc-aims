import { borrowRequestController } from "@/server/modules/borrow-requests";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/borrow-requests/{id}:
 *   get:
 *     summary: Get borrow request by id (with history)
 *     tags: [BorrowRequests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Borrow request detail
 *       403:
 *         description: Borrower cannot view another user's request
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return borrowRequestController.get(id);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return borrowRequestController.update(request, id);
}

