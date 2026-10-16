import { customReportController } from "@/server/modules/custom-reports";

export async function GET() {
  return customReportController.listFilterOptions();
}
