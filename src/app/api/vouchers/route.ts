import { voucherController } from "@/server/modules/vouchers";

export async function GET(request: Request) {
  return voucherController.list(request);
}

export async function POST(request: Request) {
  return voucherController.create(request);
}
