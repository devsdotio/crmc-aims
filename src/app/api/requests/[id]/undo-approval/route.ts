import { borrowRequestController } from "@/server/modules/borrow-requests";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/borrow-requests/{id}/undo-approval:
 *   post:
 *     summary: Revert an approved request back to pending review
 *     tags: [BorrowRequests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             note: { type: string }
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return borrowRequestController.undoApproval(request, id);
}
