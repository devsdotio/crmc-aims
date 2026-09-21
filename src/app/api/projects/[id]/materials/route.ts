import { projectController } from "@/server/modules/projects";

/**
 * @swagger
 * /api/projects/{id}/materials:
 *   post:
 *     summary: Charge inventory stock to a project (auto-checkout + FIFO cost)
 *     tags: [Projects]
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return projectController.useConsumable(request, id);
}
