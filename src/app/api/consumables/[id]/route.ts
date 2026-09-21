import { consumableController } from "@/server/modules/consumables";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return consumableController.get(id);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return consumableController.update(request, id);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return consumableController.delete(id);
}
