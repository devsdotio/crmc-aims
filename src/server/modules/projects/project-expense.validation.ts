import { z } from "zod";

/** Manual writable line types (inventory/asset write-offs use dedicated endpoints). */
export const MANUAL_LINE_TYPES = [
  "miscellaneous",
  "adjustment",
  "material",
] as const;

export const PROJECT_EXPENSE_CATEGORIES = [
  "travel",
  "snacks",
  "labor",
  "broken_asset",
  "fees",
  "adjustment",
  "miscellaneous",
  "other",
] as const;

const amountSchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Amount must be a non-zero number (negative allowed for credits).",
      });
      return z.NEVER;
    }
    return n.toFixed(2);
  });

const optionalMoneySchema = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((value, ctx) => {
    if (value === undefined || value === null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Unit cost must be a non-negative amount.",
      });
      return z.NEVER;
    }
    return n.toFixed(2);
  });

const optionalQtySchema = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((value, ctx) => {
    if (value === undefined || value === null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Quantity must be a positive number.",
      });
      return z.NEVER;
    }
    return n.toFixed(2);
  });

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.");

const categoryLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .optional()
  .nullable();

export const createProjectExpenseSchema = z
  .object({
    lineType: z.enum(MANUAL_LINE_TYPES).optional().default("miscellaneous"),
    category: z.enum(PROJECT_EXPENSE_CATEGORIES).optional().default("miscellaneous"),
    /** Required when category is `other`. */
    categoryLabel: categoryLabelSchema,
    description: z.string().trim().min(1, "Description is required.").max(500),
    amount: amountSchema,
    quantity: optionalQtySchema,
    unitCost: optionalMoneySchema,
    incurredOn: dateSchema.optional(),
    notes: z.string().trim().max(4000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.lineType === "miscellaneous" || data.lineType === "material") &&
      Number(data.amount) < 0
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Spend lines must be positive. Use an adjustment line for credits.",
        path: ["amount"],
      });
    }
    if (data.lineType === "material" && !data.description.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Material name is required.",
        path: ["description"],
      });
    }
    if (data.category === "other" && !data.categoryLabel?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a custom category when Other is selected.",
        path: ["categoryLabel"],
      });
    }
  });

export const updateProjectExpenseSchema = z
  .object({
    lineType: z.enum(MANUAL_LINE_TYPES).optional(),
    category: z.enum(PROJECT_EXPENSE_CATEGORIES).optional(),
    categoryLabel: categoryLabelSchema,
    description: z.string().trim().min(1).max(500).optional(),
    amount: amountSchema.optional(),
    quantity: optionalQtySchema,
    unitCost: optionalMoneySchema,
    incurredOn: dateSchema.optional(),
    notes: z.string().trim().max(4000).optional().nullable(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required.",
  })
  .superRefine((data, ctx) => {
    if (data.category === "other" && data.categoryLabel !== undefined) {
      if (!data.categoryLabel?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a custom category when Other is selected.",
          path: ["categoryLabel"],
        });
      }
    }
  });

export const expenseIdSchema = z.string().uuid("Invalid expense id.");

/** Charge inventory stock onto a project (lot-selected or FIFO cost). */
export const useConsumableOnProjectSchema = z.object({
  consumableId: z.string().uuid("Invalid consumable id."),
  quantity: z.number().int().positive("Quantity must be a positive integer."),
  /** When set, deduct entirely from this purchase lot. Otherwise FIFO. */
  purchaseLotId: z.string().uuid("Invalid purchase lot id.").optional(),
  description: z.string().trim().max(500).optional().nullable(),
  incurredOn: dateSchema.optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

/** Manual material not tracked in inventory (no stock deduction). */
export const createManualMaterialSchema = z
  .object({
    materialName: z.string().trim().min(1, "Material name is required.").max(255),
    description: z.string().trim().max(2000).optional().nullable(),
    quantity: z
      .union([z.string(), z.number()])
      .transform((value, ctx) => {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n) || n <= 0) {
          ctx.addIssue({
            code: "custom",
            message: "Quantity must be a positive number.",
          });
          return z.NEVER;
        }
        return n.toFixed(2);
      }),
    /** Overall cost charged to the project. */
    amount: amountSchema,
    incurredOn: dateSchema.optional(),
    notes: z.string().trim().max(4000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (Number(data.amount) < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Overall cost must be positive.",
        path: ["amount"],
      });
    }
  });

export type CreateProjectExpenseBody = z.infer<typeof createProjectExpenseSchema>;
export type UpdateProjectExpenseBody = z.infer<typeof updateProjectExpenseSchema>;
export type UseConsumableOnProjectBody = z.infer<
  typeof useConsumableOnProjectSchema
>;
export type CreateManualMaterialBody = z.infer<typeof createManualMaterialSchema>;

/** @deprecated Use MANUAL_LINE_TYPES */
export const PHASE2_LINE_TYPES = ["miscellaneous", "adjustment"] as const;
