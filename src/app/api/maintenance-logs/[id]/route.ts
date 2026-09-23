import { maintenanceController } from "@/server/modules/maintenance";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return maintenanceController.get(id);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return maintenanceController.updateOpen(request, id);
}
