import { pettyCashController } from "@/server/modules/petty-cash";

export async function GET() {
  return pettyCashController.nextCode();
}
