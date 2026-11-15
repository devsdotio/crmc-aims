import { NextResponse, type NextRequest } from "next/server";

import { requireStaffShell } from "@/server/shared/auth";
import { handleError, ok } from "@/server/shared/http";
import { ReportService } from "./report.service";
import {
  baseReportQuerySchema,
  exportReportQuerySchema,
  reportPrintIntentSchema,
} from "./report.validation";

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

  async getSummary(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getExecutiveSummary(
        session.profile.role,
        session.actor.tenantId,
        params.includeSandbox
      );
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getAssetsReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getAssetRegisterReport(
        params,
        session.profile.role,
        session.actor.tenantId
      );
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getAssetDrilldown(_request: NextRequest | Request, assetId: string) {
    try {
      const session = await requireStaffShell();
      const data = await this.service.getAssetDrilldownReport(
        assetId,
        session.profile.role,
        session.actor.tenantId
      );
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
      const data = await this.service.getConsumablesReport(
        params,
        session.profile.role,
        session.actor.tenantId
      );
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getPurchaseOrdersReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getPurchaseOrdersReport(
        params,
        session.profile.role,
        session.actor.tenantId
      );
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getRequestsReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getRequestsReport(
        params,
        session.profile.role,
        session.actor.tenantId
      );
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getMaintenanceReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getMaintenanceReport(
        params,
        session.profile.role,
        session.actor.tenantId
      );
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getProjectsReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getProjectsReport(
        params,
        session.profile.role,
        session.actor.tenantId
      );
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getDepartmentsReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = baseReportQuerySchema.parse(this.extractParams(request));
      const data = await this.service.getDepartmentsReport(
        params,
        session.profile.role,
        session.actor.tenantId
      );
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async exportReport(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const params = exportReportQuerySchema.parse(this.extractParams(request));
      const result = await this.service.exportReportCsv(
        params,
        session.profile.role,
        session.actor.tenantId,
        session.actor
      );

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

  async logPrintIntent(request: NextRequest | Request) {
    try {
      const session = await requireStaffShell();
      const body = await request.json().catch(() => ({}));
      const input = reportPrintIntentSchema.parse(body);

      await this.service.recordPrintIntent(input, session.actor);

      return ok({ logged: true });
    } catch (error) {
      return handleError(error);
    }
  }
}
