import { userController } from "@/server/modules/users";

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update a user profile (name, role, department, status)
 *     tags: [Users]
 *   delete:
 *     summary: Deactivate a user account
 *     tags: [Users]
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return userController.updateUser(request, id);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return userController.deactivateUser(id);
}
