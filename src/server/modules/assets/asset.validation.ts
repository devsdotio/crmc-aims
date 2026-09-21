import { z } from "zod";

import { ASSET_STATUSES, ASSET_ASSIGNMENT_TYPES } from "./asset.constants";

/** Free-text category name (must match Settings → Asset categories). */
export const categoryLabelSchema = z
  .string()
  .trim()
  .min(1, "Category is required.")
  .max(120, "Category is too long.");

export const assetStatusSchema = z.enum(ASSET_STATUSES);
export const assetAssignmentTypeSchema = z.enum(ASSET_ASSIGNMENT_TYPES);

export const createAssetSchema = z.object({
  /** Optional — server allocates the next unique `{PREFIX}-{NNN}` when omitted. */
  assetCode: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().min(1, "name is required.").max(255),
  category: categoryLabelSchema,
  /** Omitted status defaults to `active` in the service (not via Zod default),
   * so update schemas can safely `.partial()` without forcing status. */
  status: assetStatusSchema.optional(),
  assignmentType: assetAssignmentTypeSchema.optional(),
  /** Link unit to a multi-copy product model (optional). */
  modelId: z.string().uuid().optional().nullable(),
  location: z.string().trim().min(1, "location is required.").max(255),
  serialNumber: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  purchaseDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "purchaseDate must be YYYY-MM-DD.")
    .optional(),
  value: z.number().nonnegative().optional(),
  supplierId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().trim().max(2048).optional(),
  notes: z.string().trim().max(4000).optional(),
  isSandbox: z.boolean().optional(),
});

export const updateAssetSchema = createAssetSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for an update.",
  });

/** Manual issue / accountable release to department XOR project. */
export const releaseAssetSchema = z
  .object({
    custodyKind: z.enum(["borrow", "assignment"]).optional(),
    departmentId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    borrowerName: z.string().trim().max(255).optional(),
    borrowerDepartment: z.string().trim().min(1).max(120).optional(),
    borrowerEmail: z
      .string()
      .trim()
      .max(320)
      .optional()
      .refine((v) => !v || z.string().email().safeParse(v).success, {
        message: "Invalid email address",
      }),
    borrowerPhone: z.string().trim().max(40).optional(),
    notes: z.string().trim().max(2000).optional(),
    expectedReturnDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "expectedReturnDate must be YYYY-MM-DD.")
      .optional()
      .nullable(),
    requestedByName: z.string().trim().max(255).optional(),
    requestId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const hasDept = Boolean(data.departmentId);
    const hasProject = Boolean(data.projectId);
    if (hasDept && hasProject) {
      ctx.addIssue({
        code: "custom",
        message: "Specify department or project, not both.",
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
      data.custodyKind ??
      (data.expectedReturnDate ? ("borrow" as const) : ("assignment" as const));
    if (kind === "borrow" && !data.expectedReturnDate) {
      ctx.addIssue({
        code: "custom",
        message: "expectedReturnDate is required for borrowable release.",
        path: ["expectedReturnDate"],
      });
    }
  });

export const returnAssetSchema = z.object({
  condition: z.string().trim().min(1, "condition is required.").max(2000),
  status: assetStatusSchema.optional(),
  flagMaintenance: z.boolean().optional(),
});

export const flagMaintenanceSchema = z.object({
  description: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const reportMissingSchema = z.object({
  reason: z.enum(["lost", "stolen", "missing"]),
  notes: z.string().trim().min(1, "notes are required.").max(2000),
});

export const listAssetsQuerySchema = z.object({
  status: assetStatusSchema.optional(),
  modelId: z.string().uuid().optional(),
  category: categoryLabelSchema.optional(),
  search: z.string().trim().max(200).optional(),
  assignmentType: assetAssignmentTypeSchema.optional(),
  availableOnly: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "boolean") return v;
      return v === "true" || v === "1";
    }),
  includeSandbox: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "boolean") return v;
      return v === "true" || v === "1";
    }),
});

export const assetIdSchema = z.string().uuid("Asset id must be a valid UUID.");

export type CreateAssetBody = z.infer<typeof createAssetSchema>;
export type UpdateAssetBody = z.infer<typeof updateAssetSchema>;
export type ReturnAssetBody = z.infer<typeof returnAssetSchema>;
export type ReleaseAssetBody = z.infer<typeof releaseAssetSchema>;
export type FlagMaintenanceBody = z.infer<typeof flagMaintenanceSchema>;
export type ReportMissingBody = z.infer<typeof reportMissingSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
