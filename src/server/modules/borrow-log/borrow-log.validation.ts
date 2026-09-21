import { z } from "zod";

const assetCategorySchema = z
  .string()
  .trim()
  .min(1, "Category is required.")
  .max(120);
const returnConditionSchema = z.enum([
  "good",
  "damaged",
  "needs_repair",
  "lost",
  "stolen",
]);

/** DTO/query filter includes computed overdue and optional all. */
export const logFilterStatusSchema = z
  .enum(["active", "overdue", "returned", "voided", "all"])
  .transform((v) => (v === "all" ? undefined : v));

export const listBorrowLogQuerySchema = z.object({
  status: logFilterStatusSchema.optional(),
  department: z.string().trim().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  borrowerUserId: z.string().uuid().optional(),
  borrowerEmail: z.string().trim().max(320).optional(),
  custodyKind: z.enum(["borrow", "assignment", "all"]).optional(),
  /** Borrower department inventory: open holds for their department (excludes projects). */
  scope: z.enum(["department"]).optional(),
  includeSandbox: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "boolean") return v;
      return v === "true" || v === "1";
    }),
});

export const releaseBorrowSchema = z
  .object({
    assetId: z.string().uuid("assetId is required."),
    requestId: z.string().uuid().optional(),
    requestCode: z.string().trim().max(64).optional(),
    custodyKind: z.enum(["borrow", "assignment"]).optional(),
    source: z
      .enum(["portal", "admin_manual", "project_legacy"])
      .optional()
      .default("portal"),
    departmentId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    /** Display name for person who picked up (optional; destination is dept/project). */
    borrowerName: z.string().trim().max(255).optional(),
    borrowerEmail: z
      .string()
      .trim()
      .max(320)
      .optional()
      .default("")
      .refine((v) => v === "" || z.string().email().safeParse(v).success, {
        message: "Invalid email address",
      }),
    borrowerPhone: z.string().trim().max(40).optional().default(""),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be YYYY-MM-DD")
      .optional()
      .nullable(),
    requestedByName: z.string().trim().max(255).optional(),
    notes: z.string().trim().max(2000).optional(),
    borrowerUserId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const hasDept = Boolean(data.departmentId);
    const hasProject = Boolean(data.projectId);
    if (hasDept && hasProject) {
      ctx.addIssue({
        code: "custom",
        message: "Specify exactly one destination: department or project.",
        path: ["departmentId"],
      });
    }
    if (!hasDept && !hasProject) {
      ctx.addIssue({
        code: "custom",
        message: "Destination department or project is required.",
        path: ["departmentId"],
      });
    }
    const kind =
      data.custodyKind ?? (data.dueDate ? ("borrow" as const) : ("assignment" as const));
    if (kind === "borrow" && !data.dueDate) {
      ctx.addIssue({
        code: "custom",
        message: "dueDate is required for borrowable custody.",
        path: ["dueDate"],
      });
    }
  });

export const returnBorrowSchema = z.object({
  condition: returnConditionSchema,
  conditionNotes: z.string().trim().max(2000).optional(),
  flagMaintenance: z.boolean().optional().default(false),
});

/** Undo a mistaken active issue (primarily admin_manual). Soft-void — no hard delete. */
export const voidBorrowSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "Mistaken or incorrect issue")),
});

export const borrowLogIdSchema = z.string().uuid("Invalid log id.");
export const assetCategorySchemaExport = assetCategorySchema;

export type ReleaseBorrowBody = z.infer<typeof releaseBorrowSchema>;
export type ReturnBorrowBody = z.infer<typeof returnBorrowSchema>;
export type VoidBorrowBody = z.infer<typeof voidBorrowSchema>;
export type ListBorrowLogQuery = z.infer<typeof listBorrowLogQuerySchema>;
