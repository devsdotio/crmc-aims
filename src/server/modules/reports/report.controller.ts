import { NextResponse, type NextRequest } from "next/server";

import { requireStaffShell } from "@/server/shared/auth";
import { handleError, ok } from "@/server/shared/http";
import { ReportService } from "./report.service";
import { baseReportQuerySchema, exportReportQuerySchema } from "./report.validation";

export class ReportController {
  constructor(private readonly service = new ReportService()) {}

  private extractParams(request: Request) {
    const url = new URL(request.url);
    const raw: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      raw[key] = value;
    }
    return raw;
  }

  async getSummary(_request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const data = await this.service.getExecutiveSummary(session.profile.role);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getAssetsReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getAssetRegisterReport(params, session.profile.role);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getAssetDrilldown(_request: NextRequest | Request, assetId: string) {
    try {
      const session = await requireStaffShell();
      const data = await this.service.getAssetDrilldownReport(assetId, session.profile.role);
      if (!data) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getConsumablesReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getConsumablesReport(params, session.profile.role);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getPurchaseOrdersReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getPurchaseOrdersReport(params, session.profile.role);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getRequestsReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getRequestsReport(params, session.profile.role);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getMaintenanceReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getMaintenanceReport(params, session.profile.role);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async exportReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = exportReportQuerySchema.parse(this.extractParams(request));
      const result = await this.service.exportReportCsv(params, session.profile.role);

      return new NextResponse(result.csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${result.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return handleError(error);
    }
  }
}
