import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  entityType: z.string().trim().max(100).optional(),
  entityId: z.string().trim().max(100).optional(),
  actorUserId: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val : undefined)),
  action: z.string().trim().max(100).optional(),
  search: z.string().trim().max(200).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  criticalOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
