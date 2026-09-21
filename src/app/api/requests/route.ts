import { borrowRequestController } from "@/server/modules/borrow-requests";

/**
 * @swagger
 * /api/borrow-requests:
 *   get:
 *     summary: List borrow requests (borrowers see own; operators see all)
 *     tags: [BorrowRequests]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, released, unreleased, returned, cancelled]
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated borrow requests with status counts
 *   post:
 *     summary: Create a borrow request for a coded (borrowable) asset
 *     tags: [BorrowRequests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requesterName
 *               - requesterEmail
 *               - items
 *               - purpose
 *             properties:
 *               requesterName: { type: string }
 *               requesterEmail: { type: string, format: email }
 *               requesterPhone: { type: string }
 *               departmentId: { type: string, format: uuid }
 *               requestType: { type: string, enum: [borrowable, assignable] }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [itemDescription, category, itemType]
 *                   properties:
 *                     itemDescription: { type: string }
 *                     assetId: { type: string, format: uuid }
 *                     assetCode: { type: string }
 *                     category: { type: string }
 *                     quantity: { type: integer, default: 1 }
 *                     itemType: { type: string, enum: [asset] }
 *               purpose: { type: string }
 *               expectedReturnDate: { type: string, format: date, example: "2026-08-20" }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Request created (pending; no custody transfer yet)
 */
export async function GET(request: Request) {
  return borrowRequestController.list(request);
}

export async function POST(request: Request) {
  return borrowRequestController.create(request);
}
