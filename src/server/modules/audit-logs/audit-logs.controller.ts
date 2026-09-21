import type { NextRequest } from "next/server";
import { requireActor } from "@/server/shared/auth";
import { handleError, ok } from "@/server/shared/http";
import { AuditLogService } from "./audit-logs.service";

export class AuditLogController {
  constructor(private readonly service: AuditLogService = new AuditLogService()) {}

  async list(request: NextRequest | Request) {
    try {
      const session = await requireActor();
      const url = new URL(request.url);
      
      const queryParams = {
        entityType: url.searchParams.get("entityType")?.trim() || undefined,
        entityId: url.searchParams.get("entityId")?.trim() || undefined,
        actorUserId: url.searchParams.get("actorUserId")?.trim() || undefined,
        action: url.searchParams.get("action")?.trim() || undefined,
      };

      return ok(await this.service.list(queryParams, session));
    } catch (error) {
      return handleError(error);
    }
  }
}

export const auditLogController = new AuditLogController();
export { AuditLogService } from "./audit-logs.service";
