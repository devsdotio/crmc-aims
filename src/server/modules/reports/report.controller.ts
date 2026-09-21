import { NextResponse, type NextRequest } from "next/server";

import { requireStaffShell } from "@/server/shared/auth";
import { handleError, ok } from "@/server/shared/http";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";
import { ReportService } from "./report.service";
import {
  baseReportQuerySchema,
  exportReportQuerySchema,
  reportPrintIntentSchema,
} from "./report.validation";

export class ReportController {
  private readonly auditLogs = new AuditLogService();

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
      const data = await this.service.getExecutiveSummary(
        session.profile.role,
        session.actor.tenantId
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
        session.actor.tenantId
      );

      await this.auditLogs.log({
        entityType: AUDIT_ENTITY.report,
        entityId: params.reportType,
        action: AUDIT_ACTION.reportExported,
        actorName: session.actor.displayName,
        actorUserId: session.actor.userId,
        notes: `Exported ${params.reportType} report as ${params.format.toUpperCase()}.`,
        metadata: {
          reportType: params.reportType,
          format: params.format,
          filters: params,
          tenantId: session.actor.tenantId ?? null,
        },
      });

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

      await this.auditLogs.log({
        entityType: AUDIT_ENTITY.report,
        entityId: input.reportType,
        action: AUDIT_ACTION.reportPrintRequested,
        actorName: session.actor.displayName,
        actorUserId: session.actor.userId,
        notes: `Requested print/PDF for ${input.reportType} report.`,
        metadata: {
          reportType: input.reportType,
          filters: input.filters ?? null,
          tenantId: session.actor.tenantId ?? null,
        },
      });

      return ok({ logged: true });
    } catch (error) {
      return handleError(error);
    }
  }
}
