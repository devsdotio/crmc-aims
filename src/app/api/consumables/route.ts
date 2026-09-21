import { consumableController } from "@/server/modules/consumables";

export async function GET(request: Request) {
  return consumableController.list(request);
}

export async function POST(request: Request) {
  return consumableController.create(request);
}
