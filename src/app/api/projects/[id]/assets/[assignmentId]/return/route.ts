import { projectController } from "@/server/modules/projects";

/**
 * @swagger
 * /api/projects/{id}/assets/{assignmentId}/return:
 *   post:
 *     summary: Return an assignable asset from project custody
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes: { type: string }
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id, assignmentId } = await context.params;
  return projectController.returnAsset(request, id, assignmentId);
}
