import { projectController } from "@/server/modules/projects";

/**
 * @swagger
 * /api/projects/{id}/assets/{assignmentId}/damage:
 *   post:
 *     summary: Report damage on a project asset (maintenance or write-off)
 *     tags: [Projects]
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id, assignmentId } = await context.params;
  return projectController.reportAssetDamage(request, id, assignmentId);
}
