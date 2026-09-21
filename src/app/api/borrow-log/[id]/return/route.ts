import { borrowLogController } from "@/server/modules/borrow-log";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/borrow-log/{id}/return:
 *   post:
 *     summary: Return a borrowed asset and close the custody log
 *     tags: [BorrowLog]
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
 *             required: [condition]
 *             properties:
 *               condition:
 *                 type: string
 *                 enum: [good, fair, damaged]
 *               conditionNotes: { type: string }
 *               flagMaintenance: { type: boolean }
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return borrowLogController.returnLog(request, id);
}
