import { departmentController } from "@/server/modules/departments";

/**
 * @swagger
 * /api/departments/{id}:
 *   get:
 *     summary: Get department by id
 *     tags: [Departments]
 *   patch:
 *     summary: Update department
 *     tags: [Departments]
 *   delete:
 *     summary: Delete department (only if no linked account)
 *     tags: [Departments]
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return departmentController.get(id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return departmentController.update(request, id);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return departmentController.delete(id);
}
