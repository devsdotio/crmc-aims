import { pettyCashController } from "@/server/modules/petty-cash";

export async function GET(request: Request) {
  return pettyCashController.list(request);
}

export async function POST(request: Request) {
  return pettyCashController.create(request);
}
