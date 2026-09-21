import { borrowRequestController } from "@/server/modules/borrow-requests";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/borrow-requests/{id}/release:
 *   post:
 *     summary: Release an approved borrow request (opens borrow log + sets holder)
 *     description: |
 *       Creates an active borrow transaction when assetId is bound.
 *       Due date is taken from the request's expectedReturnDate.
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
 *             required: [pickedUpBy]
 *             properties:
 *               pickedUpBy: { type: string, description: Person who physically picked up the item }
 *               note: { type: string }
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return borrowRequestController.release(request, id);
}
