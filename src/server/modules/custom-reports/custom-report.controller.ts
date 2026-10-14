import { NextResponse, type NextRequest } from "next/server";

import { requireTenantAdmin } from "@/server/shared/auth";
import { created, handleError, ok } from "@/server/shared/http";
import { AuditLogService } from "@/server/modules/audit-logs/audit-logs.service";
import { AUDIT_ACTION, AUDIT_ENTITY } from "@/server/modules/audit-logs/audit-events";

import { CustomReportService } from "./custom-report.service";
import {
  createTemplateSchema,
  exportReportQuerySchema,
  printIntentSchema,
  runReportSchema,
  updateTemplateSchema,
} from "./custom-report.validation";

export class CustomReportController {
  private readonly auditLogs = new AuditLogService();

  constructor(private readonly service = new CustomReportService()) {}

  private extractParams(request: Request) {
    const url = new URL(request.url);
    const raw: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      raw[key] = value;
    }
    return raw;
  }

  async listDatasets() {
    try {
      await requireTenantAdmin();
      return ok(this.service.listDatasets());
    } catch (error) {
      return handleError(error);
    }
  }

  async listTemplates() {
    try {
      const session = await requireTenantAdmin();
      const data = await this.service.listTemplates(session.actor.tenantId);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getTemplate(_request: NextRequest | Request, id: string) {
    try {
      const session = await requireTenantAdmin();
      const data = await this.service.getTemplate(id, session.actor.tenantId);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async createTemplate(request: NextRequest | Request) {
    try {
      const session = await requireTenantAdmin();
      const body = await request.json();
      const input = createTemplateSchema.parse(body);
      const data = await this.service.createTemplate(input, session.actor.tenantId, {
        userId: session.actor.userId,
        displayName: session.actor.displayName,
      });

      await this.auditLogs.log({
        entityType: AUDIT_ENTITY.customReport,
        entityId: data.id,
        action: AUDIT_ACTION.created,
        actorName: session.actor.displayName,
        actorUserId: session.actor.userId,
        notes: `Created custom report template "${data.name}".`,
        metadata: { dataset: data.dataset, tenantId: session.actor.tenantId },
        tenantId: session.actor.tenantId,
      });

      return created(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async updateTemplate(request: NextRequest | Request, id: string) {
    try {
      const session = await requireTenantAdmin();
      const body = await request.json();
      const input = updateTemplateSchema.parse(body);
      const data = await this.service.updateTemplate(
        id,
        input,
        session.actor.tenantId,
        {
          userId: session.actor.userId,
          displayName: session.actor.displayName,
        }
      );

      await this.auditLogs.log({
        entityType: AUDIT_ENTITY.customReport,
        entityId: data.id,
        action: AUDIT_ACTION.updated,
        actorName: session.actor.displayName,
        actorUserId: session.actor.userId,
        notes: `Updated custom report template "${data.name}".`,
        metadata: { dataset: data.dataset, tenantId: session.actor.tenantId },
        tenantId: session.actor.tenantId,
      });

      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async deleteTemplate(_request: NextRequest | Request, id: string) {
    try {
      const session = await requireTenantAdmin();
      await this.service.deleteTemplate(id, session.actor.tenantId);

      await this.auditLogs.log({
        entityType: AUDIT_ENTITY.customReport,
        entityId: id,
        action: AUDIT_ACTION.deleted,
        actorName: session.actor.displayName,
        actorUserId: session.actor.userId,
        notes: "Deleted custom report template.",
        metadata: { tenantId: session.actor.tenantId },
        tenantId: session.actor.tenantId,
      });

      return ok({ deleted: true });
    } catch (error) {
      return handleError(error);
    }
  }

  async run(request: NextRequest | Request) {
    try {
      const session = await requireTenantAdmin();
      const body = await request.json();
      const input = runReportSchema.parse(body);
      const data = await this.service.run(input, session.actor.tenantId);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async exportCsv(request: NextRequest | Request) {
    try {
      const session = await requireTenantAdmin();
      const params = exportReportQuerySchema.parse(this.extractParams(request));
      const result = await this.service.exportCsv(params, session.actor.tenantId);

      await this.auditLogs.log({
        entityType: AUDIT_ENTITY.customReport,
        entityId: params.templateId,
        action: AUDIT_ACTION.reportExported,
        actorName: session.actor.displayName,
        actorUserId: session.actor.userId,
        notes: `Exported custom report "${result.templateName}" as CSV.`,
        metadata: {
          source: "custom-reports",
          templateId: params.templateId,
          format: "csv",
          filters: params,
          tenantId: session.actor.tenantId ?? null,
        },
        tenantId: session.actor.tenantId,
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
      const session = await requireTenantAdmin();
      const body = await request.json().catch(() => ({}));
      const input = printIntentSchema.parse(body);

      await this.auditLogs.log({
        entityType: AUDIT_ENTITY.customReport,
        entityId: input.templateId,
        action: AUDIT_ACTION.reportPrintRequested,
        actorName: session.actor.displayName,
        actorUserId: session.actor.userId,
        notes: "Requested print/PDF for custom report.",
        metadata: {
          source: "custom-reports",
          templateId: input.templateId,
          filters: input.filters ?? null,
          tenantId: session.actor.tenantId ?? null,
        },
        tenantId: session.actor.tenantId,
      });

      return ok({ logged: true });
    } catch (error) {
      return handleError(error);
    }
  }
}

export const customReportController = new CustomReportController();
