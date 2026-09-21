import { maintenanceController } from "@/server/modules/maintenance";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return maintenanceController.resolve(request, id);
}
