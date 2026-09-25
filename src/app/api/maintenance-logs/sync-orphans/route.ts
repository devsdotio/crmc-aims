import { maintenanceController } from "@/server/modules/maintenance";

export async function POST(request: Request) {
  return maintenanceController.syncOrphans(request);
}
