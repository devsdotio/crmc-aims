import { maintenanceController } from "@/server/modules/maintenance";

export async function GET(request: Request) {
  return maintenanceController.list(request);
}

export async function POST(request: Request) {
  return maintenanceController.create(request);
}
