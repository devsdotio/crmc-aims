import { pettyCashController } from "@/server/modules/petty-cash";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return pettyCashController.updateStatus(request, id);
}
