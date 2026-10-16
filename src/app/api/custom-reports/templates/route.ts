import { customReportController } from "@/server/modules/custom-reports";

export async function GET() {
  return customReportController.listTemplates();
}

export async function POST(request: Request) {
  return customReportController.createTemplate(request);
}
