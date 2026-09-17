import { z } from "zod";

const assetCategorySchema = z
  .string()
  .trim()
  .min(1, "Category is required.")
  .max(120);

export const borrowRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "released",
  "unreleased",
  "returned",
  "cancelled",
]);

export const listBorrowRequestsQuerySchema = z.object({
  status: borrowRequestStatusSchema.optional(),
  department: z.string().trim().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  requesterUserId: z.string().uuid().optional(),
  requestType: z.enum(["borrowable", "assignable"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  assetId: z.string().uuid().optional(),
  includeSandbox: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "boolean") return v;
      return v === "true" || v === "1";
    }),
});

export const createBorrowRequestSchema = z.object({
  requesterName: z.string().trim().min(1).max(255),
  requesterEmail: z.string().trim().email().max(320),
  requesterPhone: z.string().trim().max(40).optional().default(""),
  departmentId: z.string().uuid().optional(),
  department: z.string().trim().max(120).optional(),
  requestType: z.enum(["borrowable", "assignable"]).optional(),
  requestedByName: z.string().trim().max(255).optional(),
  items: z.array(
    z.object({
      itemDescription: z.string().trim().min(1).max(500),
      assetId: z.string().uuid().optional(),
      assetCode: z.string().trim().max(64).optional(),
      category: assetCategorySchema,
      quantity: z.number().int().min(1).max(999).optional().default(1),
      itemType: z.literal("asset"),
      purpose: z.string().trim().min(1).max(1000),
    })
  ).min(1, "At least one item is required."),
  /** Optional header summary; derived from item purposes when omitted. */
  purpose: z.string().trim().min(1).max(1000).optional(),
  expectedReturnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "expectedReturnDate must be YYYY-MM-DD")
    .optional(),
  notes: z.string().trim().max(2000).optional(),
  requesterUserId: z.string().uuid().optional(),
  submissionGroupId: z.string().uuid().optional(),
}).superRefine((data, ctx) => {
  const requestType = data.requestType ?? "borrowable";
  if (requestType === "borrowable" && !data.expectedReturnDate) {
    ctx.addIssue({
      code: "custom",
      message: "expectedReturnDate is required for borrowable asset requests.",
      path: ["expectedReturnDate"],
    });
  }
});

const borrowRequestAssetItemSchema = z.object({
  itemDescription: z.string().trim().min(1).max(500),
  category: assetCategorySchema,
  quantity: z.number().int().min(1).max(999),
  itemType: z.literal("asset"),
  purpose: z.string().trim().min(1).max(1000).optional(),
});

export const approveBorrowRequestSchema = z.object({
  note: z.string().trim().max(1000).optional(),
  /** Optional quantity adjustments applied at approval (category lines only). */
  items: z.array(borrowRequestAssetItemSchema).min(1).optional(),
});

export const rejectBorrowRequestSchema = z.object({
  reason: z.string().trim().min(1, "Rejection reason is required.").max(1000),
});

export const releaseBorrowRequestSchema = z.object({
  note: z.string().trim().max(1000).optional(),
  pickedUpBy: z.string().trim().min(1, "Name of person who picked up the item is required.").max(255),
  /** Admin-selected physical units to issue, one entry per request line. */
  lineAllocations: z
    .array(
      z.object({
        lineIndex: z.number().int().min(0),
        assetIds: z.array(z.string().uuid()).min(1),
      })
    )
    .min(1, "Select at least one asset to issue."),
});

export const markUnreleasedBorrowRequestSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const returnBorrowRequestSchema = z.object({
  note: z.string().trim().max(1000).optional(),
  returnedBy: z.string().trim().min(1, "Name of person who returned the item is required.").max(255),
});

export const cancelBorrowRequestSchema = z.object({
  note: z.string().trim().max(1000).optional(),
  reason: z.string().trim().max(1000).optional(),
});

export const undoBorrowRequestApprovalSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const updateBorrowRequestSchema = z.object({
  requesterName: z.string().trim().min(1).max(255).optional(),
  requesterEmail: z.string().trim().email().max(320).optional(),
  requesterPhone: z.string().trim().max(40).optional(),
  departmentId: z.string().uuid().optional(),
  requestType: z.enum(["borrowable", "assignable"]).optional(),
  requestedByName: z.string().trim().max(255).optional(),
  items: z
    .array(
      z.object({
        itemDescription: z.string().trim().min(1).max(500),
        assetId: z.string().uuid().optional(),
        assetCode: z.string().trim().max(64).optional(),
        category: assetCategorySchema,
        quantity: z.number().int().min(1).max(999).optional().default(1),
        itemType: z.literal("asset"),
        purpose: z.string().trim().min(1).max(1000).optional(),
      })
    )
    .min(1, "At least one item is required.")
    .optional(),
  purpose: z.string().trim().min(1).max(1000).optional(),
  department: z.string().trim().max(120).optional(),
  expectedReturnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "expectedReturnDate must be YYYY-MM-DD")
    .nullable()
    .optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  editReason: z
    .string()
    .trim()
    .min(1, "Edit reason / note is required for accountability.")
    .max(1000),
});

export const borrowRequestIdSchema = z.string().uuid("Invalid request id.");

export type CreateBorrowRequestBody = z.infer<typeof createBorrowRequestSchema>;
export type UpdateBorrowRequestBody = z.infer<typeof updateBorrowRequestSchema>;
export type ApproveBorrowRequestBody = z.infer<typeof approveBorrowRequestSchema>;
export type RejectBorrowRequestBody = z.infer<typeof rejectBorrowRequestSchema>;
export type ReleaseBorrowRequestBody = z.infer<typeof releaseBorrowRequestSchema>;
export type MarkUnreleasedBorrowRequestBody = z.infer<typeof markUnreleasedBorrowRequestSchema>;
export type ReturnBorrowRequestBody = z.infer<typeof returnBorrowRequestSchema>;
export type CancelBorrowRequestBody = z.infer<typeof cancelBorrowRequestSchema>;
export type UndoBorrowRequestApprovalBody = z.infer<typeof undoBorrowRequestApprovalSchema>;
export type ListBorrowRequestsQuery = z.infer<typeof listBorrowRequestsQuerySchema>;

