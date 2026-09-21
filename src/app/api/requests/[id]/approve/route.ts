import { borrowRequestController } from "@/server/modules/borrow-requests";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/borrow-requests/{id}/approve:
 *   post:
 *     summary: Approve a pending borrow request
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
 *               assetId: { type: string, format: uuid, description: Bind specific unit on approve }
 *               assetCode: { type: string }
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return borrowRequestController.approve(request, id);
}
