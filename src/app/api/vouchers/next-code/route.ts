import { voucherController } from "@/server/modules/vouchers";

export async function GET(request: Request) {
  return voucherController.nextCode(request);
}
