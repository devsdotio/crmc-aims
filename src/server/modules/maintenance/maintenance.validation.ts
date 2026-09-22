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

function sumPartCosts(
  parts: Array<{ cost: string | null }>
): string | null {
  const partCosts = parts
    .map((p) => p.cost)
    .filter((c): c is string => c != null && c !== "");
  if (partCosts.length === 0) return null;
  return partCosts.reduce((acc, c) => acc + Number(c), 0).toFixed(2);
}

function resolveRepairCost(
  explicit: string | null | undefined,
  parts: Array<{ cost: string | null }>
): string | null {
  if (explicit != null && explicit !== "") return explicit;
  return sumPartCosts(parts);
}

export const listMaintenanceQuerySchema = z.object({
  openOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
  search: z.string().trim().max(200).optional(),
  condition: conditionSchema.optional(),
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

export const createMaintenanceSchema = z.object({
  assetId: z.string().uuid().optional(),
  assetCode: z.string().trim().min(1).max(64),
  assetName: z.string().trim().min(1).max(255),
  category: assetCategorySchema,
  condition: conditionSchema.default("needs_maintenance"),
  source: sourceSchema.optional().default("manual_flag"),
  notes: z
    .string()
    .trim()
    .min(1, "Issue description is required.")
    .max(4000),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  relatedBorrowLogCode: z.string().trim().max(64).optional(),
});

export const updateOpenMaintenanceSchema = z
  .object({
    workNotes: z.string().trim().max(4000).optional(),
    repairCost: optionalMoneySchema,
    repairParts: z.array(repairPartSchema).max(40).optional(),
    scheduledDate: z
      .union([
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        z.literal(""),
        z.null(),
      ])
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null || v === "") return null;
        return v;
      }),
  })
  .refine(
    (data) =>
      data.workNotes !== undefined ||
      data.repairCost !== undefined ||
      data.repairParts !== undefined ||
      data.scheduledDate !== undefined,
    { message: "Provide at least one field to update." }
  )
  .transform((data) => {
    const parts =
      data.repairParts !== undefined
        ? data.repairParts.map((p) => ({
            name: p.name,
            cost: p.cost ?? null,
          }))
        : undefined;

    const repairCost =
      data.repairCost !== undefined
        ? resolveRepairCost(data.repairCost, parts ?? [])
        : parts !== undefined
          ? resolveRepairCost(null, parts)
          : undefined;

    return {
      ...(data.workNotes !== undefined ? { workNotes: data.workNotes } : {}),
      ...(parts !== undefined ? { repairParts: parts } : {}),
      ...(repairCost !== undefined ? { repairCost } : {}),
      ...(data.scheduledDate !== undefined
        ? { scheduledDate: data.scheduledDate }
        : {}),
    };
  });

export const resolveMaintenanceSchema = z
  .object({
    resolutionNotes: z.string().trim().min(1).max(4000),
    /** Optional overall cost; when blank, summed from repairParts. */
    repairCost: optionalMoneySchema,
    repairParts: z.array(repairPartSchema).max(40).optional().default([]),
    /** Explicit confirmation that no parts/materials were used. */
    noPartsUsed: z.boolean().optional().default(false),
    resolutionDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "resolutionDate must be YYYY-MM-DD.")
      .optional(),
    /** Displayed as "Assigned to" in the UI; stored as resolvedByName. */
    technician: z.string().trim().min(1, "Assigned to is required.").max(255),
  })
  .superRefine((data, ctx) => {
    const parts = data.repairParts ?? [];
    if (!data.noPartsUsed && parts.length === 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "Add at least one part/material, or confirm that no parts were used.",
        path: ["repairParts"],
      });
    }
    if (data.noPartsUsed && parts.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "Clear part lines when confirming no parts were used.",
        path: ["noPartsUsed"],
      });
    }
  })
  .transform((data) => {
    const parts = data.noPartsUsed ? [] : (data.repairParts ?? []);
    const repairCost = data.noPartsUsed
      ? data.repairCost ?? null
      : resolveRepairCost(data.repairCost, parts);

    return {
      resolutionNotes: data.resolutionNotes,
      resolutionDate: data.resolutionDate,
      technician: data.technician,
      noPartsUsed: data.noPartsUsed ?? false,
      repairParts: parts.map((p) => ({
        name: p.name,
        cost: p.cost ?? null,
      })),
      repairCost,
    };
  });

export const maintenanceIdSchema = z.string().uuid("Invalid maintenance log id.");

export type CreateMaintenanceBody = z.infer<typeof createMaintenanceSchema>;
export type UpdateOpenMaintenanceBody = z.infer<
  typeof updateOpenMaintenanceSchema
>;
export type ResolveMaintenanceBody = z.infer<typeof resolveMaintenanceSchema>;
export type ListMaintenanceQuery = z.infer<typeof listMaintenanceQuerySchema>;
