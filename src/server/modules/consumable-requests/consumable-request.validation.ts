import { z } from "zod";

export const consumableRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "released",
  "cancelled",
]);

export const listConsumableRequestsQuerySchema = z.object({
  status: consumableRequestStatusSchema.optional(),
  department: z.string().trim().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  requesterUserId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  includeSandbox: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "boolean") return v;
      return v === "true" || v === "1";
    }),
});

const requestLineInputSchema = z.object({
  consumableId: z.string().uuid("Invalid consumable id."),
  quantity: z.number().int().min(1).max(999_999),
  purpose: z.string().trim().min(1).max(1000),
  notes: z.string().trim().max(1000).optional(),
});

export const createConsumableRequestSchema = z
  .object({
    requesterName: z.string().trim().min(1).max(255),
    requesterEmail: z.string().trim().email().max(320),
    requesterPhone: z.string().trim().max(40).optional().default(""),
    departmentId: z.string().uuid().optional(),
    /** Free-text department when not selecting from catalog. */
    department: z.string().trim().max(120).optional(),
    projectId: z.string().uuid().optional(),
    requestedByName: z.string().trim().max(255).optional(),
    /** Optional header summary; derived from line purposes when omitted. */
    purpose: z.string().trim().min(1).max(1000).optional(),
    notes: z.string().trim().max(2000).optional(),
    requesterUserId: z.string().uuid().optional(),
    submissionGroupId: z.string().uuid().optional(),
    lines: z
      .array(requestLineInputSchema)
      .min(1, "At least one product line is required.")
      .max(50),
  })
  .superRefine((data, ctx) => {
    if (data.departmentId && data.projectId) {
      ctx.addIssue({
        code: "custom",
        message: "Specify department or project, not both.",
        path: ["departmentId"],
      });
    }
  });

const approveConsumableLineSchema = z.object({
  lineId: z.string().uuid().optional(),
  consumableId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99999),
});

export const approveConsumableRequestSchema = z.object({
  note: z.string().trim().max(1000).optional(),
  lines: z.array(approveConsumableLineSchema).min(1).optional(),
});

export const rejectConsumableRequestSchema = z.object({
  reason: z.string().trim().min(1, "Rejection reason is required.").max(1000),
});

export const cancelConsumableRequestSchema = z.object({
  note: z.string().trim().max(1000).optional(),
  reason: z.string().trim().max(1000).optional(),
});

export const undoConsumableRequestApprovalSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

const lotAllocationSchema = z
  .object({
    lotId: z.string().uuid().optional(),
    lotCode: z.string().trim().min(1).max(64).optional(),
    quantity: z.number().int().positive(),
  })
  .refine((a) => Boolean(a.lotId || a.lotCode), {
    message: "Each allocation needs lotId or lotCode.",
  });

const releaseLineSchema = z.object({
  lineId: z.string().uuid(),
  allocations: z.array(lotAllocationSchema).min(1, "Select a lot for this line."),
});

export const releaseConsumableRequestSchema = z
  .object({
    note: z.string().trim().max(1000).optional(),
    receivedBy: z
      .string()
      .trim()
      .min(1, "Name of person who received the supplies is required.")
      .max(255),
    lines: z.array(releaseLineSchema).min(1),
  });

export const updateConsumableRequestSchema = z
  .object({
    requesterName: z.string().trim().min(1).max(255).optional(),
    requesterEmail: z.string().trim().email().max(320).optional(),
    requesterPhone: z.string().trim().max(40).optional(),
    departmentId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    department: z.string().trim().max(120).nullable().optional(),
    requestedByName: z.string().trim().max(255).nullable().optional(),
    purpose: z.string().trim().min(1).max(1000).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    lines: z
      .array(requestLineInputSchema)
      .min(1, "At least one product line is required.")
      .max(50)
      .optional(),
    editReason: z
      .string()
      .trim()
      .min(1, "Edit reason / note is required for accountability.")
      .max(1000),
  })
  .superRefine((data, ctx) => {
    if (data.departmentId && data.projectId) {
      ctx.addIssue({
        code: "custom",
        message: "Specify department or project, not both.",
        path: ["departmentId"],
      });
    }
  });

export const consumableRequestIdSchema = z.string().uuid("Invalid request id.");

export type CreateConsumableRequestBody = z.infer<
  typeof createConsumableRequestSchema
>;
export type UpdateConsumableRequestBody = z.infer<
  typeof updateConsumableRequestSchema
>;
export type ApproveConsumableRequestBody = z.infer<
  typeof approveConsumableRequestSchema
>;
export type RejectConsumableRequestBody = z.infer<
  typeof rejectConsumableRequestSchema
>;
export type CancelConsumableRequestBody = z.infer<
  typeof cancelConsumableRequestSchema
>;
export type UndoConsumableRequestApprovalBody = z.infer<
  typeof undoConsumableRequestApprovalSchema
>;
export type ReleaseConsumableRequestBody = z.infer<
  typeof releaseConsumableRequestSchema
>;
export type ListConsumableRequestsQuery = z.infer<
  typeof listConsumableRequestsQuerySchema
>;

