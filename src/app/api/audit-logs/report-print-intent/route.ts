import { reportController } from "@/server/modules/reports";

export async function POST(request: Request) {
  return reportController.logPrintIntent(request);
}

