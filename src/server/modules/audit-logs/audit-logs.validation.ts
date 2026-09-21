import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  entityType: z.string().trim().max(100).optional(),
  entityId: z.string().trim().max(100).optional(),
  actorUserId: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val : undefined)),
  action: z.string().trim().max(100).optional(),
});

export type ListAuditLogsQuery = Partial<{
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
}>;
