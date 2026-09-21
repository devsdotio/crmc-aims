import { supplierController } from "@/server/modules/suppliers";

/**
 * @swagger
 * /api/suppliers/{id}:
 *   get:
 *     summary: Get supplier by id
 *     tags: [Suppliers]
 *   patch:
 *     summary: Update supplier
 *     tags: [Suppliers]
 *   delete:
 *     summary: Deactivate supplier (soft)
 *     tags: [Suppliers]
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return supplierController.get(id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return supplierController.update(request, id);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return supplierController.deactivate(id);
}
