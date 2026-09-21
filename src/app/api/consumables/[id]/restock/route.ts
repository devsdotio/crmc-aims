import { consumableController } from "@/server/modules/consumables";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return consumableController.restock(request, id);
}
