import { projectController } from "@/server/modules/projects";

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get a project by id
 *     tags: [Projects]
 *   patch:
 *     summary: Update a project (blocked when completed)
 *     tags: [Projects]
 *   delete:
 *     summary: Delete draft/cancelled projects
 *     tags: [Projects]
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return projectController.get(id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return projectController.update(request, id);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return projectController.delete(id);
}
