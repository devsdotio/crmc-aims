import { voucherController } from "@/server/modules/vouchers";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return voucherController.updateStatus(request, id);
}
