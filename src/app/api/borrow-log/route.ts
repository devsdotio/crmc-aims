import { borrowLogController } from "@/server/modules/borrow-log";

/**
 * @swagger
 * /api/borrow-log:
 *   get:
 *     summary: List borrow/return custody logs
 *     tags: [BorrowLog]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, overdue, returned, all]
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated custody logs (overdue derived from dueDate)
 *   post:
 *     summary: Direct release — create borrow log + set asset holder (admin path)
 *     tags: [BorrowLog]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetId, borrowerName, department, dueDate]
 *             properties:
 *               assetId: { type: string, format: uuid }
 *               borrowerName: { type: string }
 *               borrowerEmail: { type: string }
 *               borrowerPhone: { type: string }
 *               department: { type: string }
 *               dueDate: { type: string, format: date }
 *               notes: { type: string }
 */
export async function GET(request: Request) {
  return borrowLogController.list(request);
}

export async function POST(request: Request) {
  return borrowLogController.release(request);
}
