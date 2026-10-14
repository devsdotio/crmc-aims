import { customReportController } from "@/server/modules/custom-reports";

export async function POST(request: Request) {
  return customReportController.logPrintIntent(request);
}