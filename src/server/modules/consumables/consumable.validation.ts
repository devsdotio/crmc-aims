import { z } from "zod";
import {
  CONSUMABLE_CLASSIFICATIONS,
  DEFAULT_CONSUMABLE_CLASSIFICATION,
} from "@/lib/consumable-classification";

/** Free-text category name (must match Settings → Consumable categories). */
export const consumableCategorySchema = z
  .string()
  .trim()
  .min(1, "Category is required.")
  .max(120);

export const consumableClassificationSchema = z
  .enum(CONSUMABLE_CLASSIFICATIONS)
  .default(DEFAULT_CONSUMABLE_CLASSIFICATION);

export const stockLevelSchema = z.enum(["all", "healthy", "low", "critical"]);

export const listConsumablesQuerySchema = z.object({
  category: consumableCategorySchema.optional(),
  classification: z.enum(CONSUMABLE_CLASSIFICATIONS).optional(),
  stockLevel: stockLevelSchema.optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  /** Request-wizard catalog: allow warehouse browse for borrowers. */
  catalog: z
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

export const createConsumableSchema = z
  .object({
    itemCode: z.string().trim().min(1).max(64).optional(),
    name: z.string().trim().min(1).max(255),
    category: consumableCategorySchema,
    classification: consumableClassificationSchema,
    unit: z.string().trim().min(1).max(40),
    currentQty: z.number().int().min(0).optional().default(0),
    minThreshold: z.number().int().min(0).optional().default(0),
    location: z.string().trim().min(1).max(120),
    supplier: z.string().trim().max(255).optional(),
    supplierId: z.string().uuid().optional().nullable(),
    /** Required when currentQty > 0 — opening lot must have a real unit cost. */
    unitCost: z.union([z.string(), z.number()]).optional(),
    notes: z.string().trim().max(2000).optional(),
    isSandbox: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.currentQty ?? 0) <= 0) return;

    if (!data.supplierId) {
      ctx.addIssue({
        code: "custom",
        message: "Supplier is required when adding initial stock.",
        path: ["supplierId"],
      });
    }

    const raw = data.unitCost;
    if (raw === undefined || raw === null || raw === "") {
      ctx.addIssue({
        code: "custom",
        message: "Unit cost is required when adding initial stock.",
        path: ["unitCost"],
      });
      return;
    }
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Unit cost must be greater than zero when adding initial stock.",
        path: ["unitCost"],
      });
    }
  });

export const updateConsumableSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    category: consumableCategorySchema.optional(),
    classification: z.enum(CONSUMABLE_CLASSIFICATIONS).optional(),
    unit: z.string().trim().min(1).max(40).optional(),
    minThreshold: z.number().int().min(0).optional(),
    location: z.string().trim().min(1).max(120).optional(),
    supplier: z.string().trim().max(255).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    isSandbox: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required.",
  });

export const stockMovementSchema = z
  .object({
    quantity: z.number().int().positive("quantity must be positive."),
    reason: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(2000).optional(),
    departmentId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    receivedBy: z.string().trim().max(255).optional(),
  })
  .superRefine((data, ctx) => {
    const hasDept = Boolean(data.departmentId);
    const hasProject = Boolean(data.projectId);
    if (hasDept === hasProject) {
      ctx.addIssue({
        code: "custom",
        message: "Specify exactly one destination: department or project.",
        path: ["departmentId"],
      });
    }
  });

/**
 * Restock with cost tracking (phase 1.5).
 * `unitCost` is required so project spend can later price inventory use correctly.
 */
export const restockSchema = z.object({
  quantity: z.number().int().positive("quantity must be positive."),
  unitCost: z
    .union([z.string(), z.number()])
    .transform((value, ctx) => {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({
          code: "custom",
          message: "unitCost must be a non-negative amount.",
        });
        return z.NEVER;
      }
      return n.toFixed(2);
    }),
  supplierId: z.string().uuid().optional().nullable(),
  reason: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  purchasedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** Adjustment can increase or decrease; quantityChange signed. Must stay lot-synced. */
export const stockAdjustSchema = z
  .object({
    quantityChange: z
      .number()
      .int()
      .refine((n) => n !== 0, "quantityChange cannot be zero."),
    reason: z.string().trim().min(1).max(500),
    notes: z.string().trim().max(2000).optional(),
    /**
     * If true, decrease will automatically consume oldest lots in FIFO order.
     */
    useFifo: z.boolean().optional(),
    /**
     * Required when decreasing (unless useFifo=true): which lot(s) lose quantity.
     * Sum of allocation quantities must equal abs(quantityChange).
     */
    allocations: z
      .array(
        z
          .object({
            lotId: z.string().uuid().optional(),
            lotCode: z.string().trim().min(1).max(64).optional(),
            quantity: z.number().int().positive(),
          })
          .refine((a) => Boolean(a.lotId || a.lotCode), {
            message: "Each allocation needs lotId or lotCode.",
          })
      )
      .optional(),
    /** Increase: attach found stock onto an existing lot. */
    attachLotId: z.string().uuid().optional(),
    attachLotCode: z.string().trim().min(1).max(64).optional(),
    /**
     * Increase: create a correction lot (default path when not attaching).
     * unitCost defaults to 0.00 when omitted.
     */
    createCorrectionLot: z.boolean().optional(),
    unitCost: z
      .union([z.string(), z.number()])
      .transform((value, ctx) => {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n) || n < 0) {
          ctx.addIssue({
            code: "custom",
            message: "unitCost must be a non-negative amount.",
          });
          return z.NEVER;
        }
        return n.toFixed(2);
      })
      .optional(),
    supplierId: z.string().uuid().optional().nullable(),
  })
  .superRefine((body, ctx) => {
    if (body.quantityChange < 0) {
      const need = Math.abs(body.quantityChange);
      const hasAllocations = Boolean(body.allocations && body.allocations.length > 0);
      if (!body.useFifo && !hasAllocations) {
        ctx.addIssue({
          code: "custom",
          path: ["allocations"],
          message:
            "Decreasing stock requires lot allocations or useFifo=true so lot remainders stay in sync.",
        });
        return;
      }
      if (hasAllocations) {
        const sum = body.allocations!.reduce((s, a) => s + a.quantity, 0);
        if (sum !== need) {
          ctx.addIssue({
            code: "custom",
            path: ["allocations"],
            message: `Allocation quantities must total ${need} (got ${sum}).`,
          });
        }
      }
      return;
    }

    // Increase
    const attaching = Boolean(body.attachLotId || body.attachLotCode);
    if (!attaching && body.createCorrectionLot === undefined) {
      body.createCorrectionLot = true;
    }
    if (attaching && body.createCorrectionLot === true) {
      ctx.addIssue({
        code: "custom",
        path: ["createCorrectionLot"],
        message: "Choose either attach-to-lot or createCorrectionLot, not both.",
      });
    }
  });

export const consumableIdSchema = z.string().uuid("Invalid consumable id.");

/** Admin walk-up issue from on-hand stock. Lot must be chosen (no FIFO). */
export const issueConsumableSchema = z
  .object({
    quantity: z.number().int().positive("quantity must be positive."),
    departmentId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    lotId: z.string().uuid().optional(),
    lotCode: z.string().trim().min(1).max(64).optional(),
    receivedBy: z.string().trim().max(255).optional(),
    requestedByName: z.string().trim().max(255).optional(),
    notes: z.string().trim().max(2000).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const hasDept = Boolean(data.departmentId);
    const hasProject = Boolean(data.projectId);
    if (hasDept === hasProject) {
      ctx.addIssue({
        code: "custom",
        message: "Specify exactly one destination: department or project.",
        path: ["departmentId"],
      });
    }
    if (!data.lotId && !data.lotCode) {
      ctx.addIssue({
        code: "custom",
        message: "Select a purchase lot to issue from.",
        path: ["lotId"],
      });
    }
  });

export type CreateConsumableBody = z.infer<typeof createConsumableSchema>;
export type UpdateConsumableBody = z.infer<typeof updateConsumableSchema>;
export type StockMovementBody = z.infer<typeof stockMovementSchema>;
export type RestockBody = z.infer<typeof restockSchema>;
export type StockAdjustBody = z.infer<typeof stockAdjustSchema>;
export type IssueConsumableBody = z.infer<typeof issueConsumableSchema>;
