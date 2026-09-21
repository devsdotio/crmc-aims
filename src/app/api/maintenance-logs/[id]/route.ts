import { maintenanceController } from "@/server/modules/maintenance";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return maintenanceController.get(id);
}
