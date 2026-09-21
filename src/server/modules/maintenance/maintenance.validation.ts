import { z } from "zod";

const assetCategorySchema = z
  .string()
  .trim()
  .min(1, "Category is required.")
  .max(120);
const conditionSchema = z.enum([
  "good",
  "needs_maintenance",
  "damaged",
  "resolved",
]);
const sourceSchema = z.enum([
  "return_checkout",
  "manual_flag",
  "project_assignment",
]);

const optionalMoneySchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Cost must be a non-negative number.",
      });
      return z.NEVER;
    }
    return n.toFixed(2);
  });

export const repairPartSchema = z.object({
  name: z.string().trim().min(1, "Part name is required.").max(255),
  cost: optionalMoneySchema,
});

export const listMaintenanceQuerySchema = z.object({
  openOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
  search: z.string().trim().max(200).optional(),
  condition: conditionSchema.optional(),
  includeSandbox: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "boolean") return v;
      return v === "true" || v === "1";
    }),
});

export const createMaintenanceSchema = z.object({
  assetId: z.string().uuid().optional(),
  assetCode: z.string().trim().min(1).max(64),
  assetName: z.string().trim().min(1).max(255),
  category: assetCategorySchema,
  condition: conditionSchema.default("needs_maintenance"),
  source: sourceSchema.optional().default("manual_flag"),
  notes: z.string().trim().max(4000).optional().default(""),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  relatedBorrowLogCode: z.string().trim().max(64).optional(),
});

export const resolveMaintenanceSchema = z
  .object({
    resolutionNotes: z.string().trim().min(1).max(4000),
    /** Optional overall cost; when blank, summed from repairParts. */
    repairCost: optionalMoneySchema,
    repairParts: z.array(repairPartSchema).max(40).optional().default([]),
    resolutionDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "resolutionDate must be YYYY-MM-DD.")
      .optional(),
    /** Displayed as "Assigned to" in the UI; stored as resolvedByName. */
    technician: z.string().trim().min(1, "Assigned to is required.").max(255),
  })
  .transform((data) => {
    const parts = data.repairParts ?? [];
    const partCosts = parts
      .map((p) => p.cost)
      .filter((c): c is string => c != null && c !== "");
    const partsSum =
      partCosts.length > 0
        ? partCosts.reduce((acc, c) => acc + Number(c), 0).toFixed(2)
        : null;

    // Explicit overall cost wins; blank overall falls back to line-item sum.
    const repairCost =
      data.repairCost != null && data.repairCost !== ""
        ? data.repairCost
        : partsSum;

    return {
      resolutionNotes: data.resolutionNotes,
      resolutionDate: data.resolutionDate,
      technician: data.technician,
      repairParts: parts.map((p) => ({
        name: p.name,
        cost: p.cost ?? null,
      })),
      repairCost,
    };
  });

export const maintenanceIdSchema = z.string().uuid("Invalid maintenance log id.");

export type CreateMaintenanceBody = z.infer<typeof createMaintenanceSchema>;
export type ResolveMaintenanceBody = z.infer<typeof resolveMaintenanceSchema>;
export type ListMaintenanceQuery = z.infer<typeof listMaintenanceQuerySchema>;
