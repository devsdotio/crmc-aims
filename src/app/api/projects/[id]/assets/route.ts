import { projectController } from "@/server/modules/projects";

/**
 * @swagger
 * /api/projects/{id}/assets:
 *   get:
 *     summary: List assignable assets assigned to a project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [assigned, returned, written_off, all]
 *   post:
 *     summary: Assign an assignable asset to a project (long-term custody)
 *     description: Only assets with assignment_type=assignable. Not the short-term borrow queue.
 *     tags: [Projects]
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
 *             required: [assetId]
 *             properties:
 *               assetId: { type: string, format: uuid }
 *               notes: { type: string }
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return projectController.listAssets(request, id);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return projectController.assignAsset(request, id);
}
