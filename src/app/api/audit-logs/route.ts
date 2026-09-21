import { auditLogController } from "@/server/modules/audit-logs";

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: List audit logs
 *     tags: [AuditLogs]
 */
export async function GET(request: Request) {
  return auditLogController.list(request);
}
