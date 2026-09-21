import { purchaseLotController } from "@/server/modules/purchase-lots";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return purchaseLotController.updateStatus(id, request);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return purchaseLotController.updateStatus(id, request);
}
