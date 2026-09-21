import { z } from "zod";

import {
  assetAssignmentTypeSchema,
  categoryLabelSchema,
  releaseAssetSchema,
} from "./asset.validation";

export const assetModelIdSchema = z
  .string()
  .uuid("Asset model id must be a valid UUID.");

export const createAssetModelSchema = z.object({
  modelCode: z
    .string()
    .trim()
    .min(1, "modelCode is required.")
    .max(64)
    .regex(
      /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
      "modelCode may only contain letters, numbers, and hyphens."
    ),
  name: z.string().trim().min(1, "name is required.").max(255),
  category: categoryLabelSchema,
  description: z.string().trim().max(4000).optional(),
  manufacturer: z.string().trim().max(255).optional(),
  defaultAssignmentType: assetAssignmentTypeSchema.optional(),
  defaultLocation: z.string().trim().max(255).optional(),
  defaultUnitValue: z.number().nonnegative().optional(),
  imageUrl: z.string().trim().max(2048).optional(),
  notes: z.string().trim().max(4000).optional(),
  isSandbox: z.boolean().optional(),
});

export const updateAssetModelSchema = createAssetModelSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for an update.",
  });

/**
 * Register N physical units under a model (or create model + units in one shot).
 * Each unit receives a unique asset_code: `{codePrefix}-{001…N}` (or continuing sequence).
 */
export const bulkRegisterUnitsSchema = z.object({
  /** Required units to mint. */
  quantity: z
    .number()
    .int()
    .min(1, "quantity must be at least 1.")
    .max(500, "quantity cannot exceed 500 per request."),
  /**
   * Code prefix for sequential tags, e.g. `PRT-310` → PRT-310-001 …
   * Defaults to modelCode when registering under an existing model.
   */
  codePrefix: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .regex(
      /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
      "codePrefix may only contain letters, numbers, and hyphens."
    )
    .optional(),
  location: z.string().trim().min(1).max(255).optional(),
  assignmentType: assetAssignmentTypeSchema.optional(),
  department: z.string().trim().max(120).optional(),
  purchaseDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Unit acquisition cost applied to every unit (and one purchase lot each). */
  unitValue: z.number().nonnegative().optional(),
  supplierId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(4000).optional(),
  /**
   * Optional serial numbers (length must equal quantity when provided).
   */
  serialNumbers: z.array(z.string().trim().max(120)).optional(),
});

/**
 * One-shot: create product model + mint N tagged units.
 * Example: Epson 310 Printer × 30 with individual QR codes.
 */
export const bulkCreateAssetsSchema = createAssetModelSchema
  .extend({
    quantity: bulkRegisterUnitsSchema.shape.quantity,
    codePrefix: bulkRegisterUnitsSchema.shape.codePrefix,
    location: z.string().trim().min(1, "location is required.").max(255),
    assignmentType: assetAssignmentTypeSchema.optional(),
    department: z.string().trim().max(120).optional(),
    purchaseDate: bulkRegisterUnitsSchema.shape.purchaseDate,
    unitValue: bulkRegisterUnitsSchema.shape.unitValue,
    supplierId: bulkRegisterUnitsSchema.shape.supplierId,
    notes: bulkRegisterUnitsSchema.shape.notes,
    serialNumbers: bulkRegisterUnitsSchema.shape.serialNumbers,
  })
  .superRefine((data, ctx) => {
    if (data.serialNumbers && data.serialNumbers.length !== data.quantity) {
      ctx.addIssue({
        code: "custom",
        message: "serialNumbers length must match quantity.",
        path: ["serialNumbers"],
      });
    }
  });

export const listAssetModelsQuerySchema = z.object({
  category: categoryLabelSchema.optional(),
  search: z.string().trim().max(200).optional(),
  includeSandbox: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "boolean") return v;
      return v === "true" || v === "1";
    }),
});

/** Operator scanner: release by QR payload or bare asset code. */
export const scanReleaseAssetSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "code (QR payload or asset code) is required."),
  })
  .and(releaseAssetSchema);

export const scanReturnAssetSchema = z.object({
  code: z.string().trim().min(1, "code (QR payload or asset code) is required."),
  condition: z.string().trim().min(1, "condition is required.").max(2000),
  status: z
    .enum(["active", "needs_repair", "out_of_service", "retired"])
    .optional(),
  flagMaintenance: z.boolean().optional(),
});

export const resolveScanSchema = z.object({
  code: z.string().trim().min(1, "code is required."),
});

export const lookupAssetCodeSchema = z.object({
  code: z.string().trim().min(1, "code is required."),
});

export type CreateAssetModelBody = z.infer<typeof createAssetModelSchema>;
export type UpdateAssetModelBody = z.infer<typeof updateAssetModelSchema>;
export type BulkRegisterUnitsBody = z.infer<typeof bulkRegisterUnitsSchema>;
export type BulkCreateAssetsBody = z.infer<typeof bulkCreateAssetsSchema>;
export type ScanReleaseAssetBody = z.infer<typeof scanReleaseAssetSchema>;
export type ScanReturnAssetBody = z.infer<typeof scanReturnAssetSchema>;
