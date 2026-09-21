import { borrowLogController } from "@/server/modules/borrow-log";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/borrow-log/{id}:
 *   get:
 *     summary: Get a single borrow custody log with history
 *     tags: [BorrowLog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Borrow transaction detail
 *   delete:
 *     summary: Permanently delete a custody log (superadmin only)
 *     tags: [BorrowLog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Log deleted
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return borrowLogController.get(id);
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return borrowLogController.hardDelete(request, id);
}
