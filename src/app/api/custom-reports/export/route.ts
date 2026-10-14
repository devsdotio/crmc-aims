import { customReportController } from "@/server/modules/custom-reports";

export async function GET(request: Request) {
  return customReportController.exportCsv(request);
}
