import { z } from "zod";

export const assignAssetToProjectSchema = z.object({
  assetId: z.string().uuid("Invalid asset id."),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const returnProjectAssetSchema = z.object({
  notes: z.string().trim().max(2000).optional().nullable(),
});

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.");

/** Optional non-negative money (₱0 allowed for free write-offs). */
const optionalWriteOffAmountSchema = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((value, ctx) => {
    if (value === undefined || value === null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Write-off amount must be a non-negative number.",
      });
      return z.NEVER;
    }
    return n.toFixed(2);
  });

/**
 * Report damage on an open project assignment.
 * - maintenance: keep custody; flag repair + MNT log
 * - write_off: close assignment, charge project expense, retire/OOS asset
 */
export const reportProjectAssetDamageSchema = z.object({
  mode: z.enum(["maintenance", "write_off"]),
  amount: optionalWriteOffAmountSchema,
  assetStatus: z.enum(["out_of_service", "retired"]).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  incurredOn: dateSchema.optional(),
  notes: z.string().trim().min(1, "Describe the damage or loss.").max(4000),
});

export const assignmentIdSchema = z.string().uuid("Invalid assignment id.");

export type AssignAssetToProjectBody = z.infer<
  typeof assignAssetToProjectSchema
>;
export type ReturnProjectAssetBody = z.infer<typeof returnProjectAssetSchema>;
export type ReportProjectAssetDamageBody = z.infer<
  typeof reportProjectAssetDamageSchema
>;