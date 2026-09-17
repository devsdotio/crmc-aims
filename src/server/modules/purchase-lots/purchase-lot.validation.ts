import { z } from "zod";

export const purchaseLotItemTypeSchema = z.enum(["consumable", "asset"]);

export const purchaseOrderStatusSchema = z.enum([
  "pending_approval",
  "approved",
  "ordered",
  "delivered",
  "cancelled",
]);

export const listPurchaseLotsQuerySchema = z.object({
  consumableId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  itemType: purchaseLotItemTypeSchema.optional(),
  status: purchaseOrderStatusSchema.optional(),
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

export const purchaseLotIdSchema = z.string().uuid("Invalid purchase lot id.");

export const createPurchaseOrderItemSchema = z.object({
  itemType: purchaseLotItemTypeSchema,
  consumableId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  isNewItem: z.boolean().optional(),
  name: z.string().trim().min(1, "Item name is required."),
  category: z.string().trim().min(1, "Category is required."),
  /** Required when creating a new consumable from a PO line. */
  classification: z.enum(["supply", "material"]).optional(),
  unit: z.string().trim().optional(),
  minThreshold: z.number().int().min(0).optional(),
  location: z.string().trim().optional(),
  assignmentType: z.enum(["borrowable", "assignable"]).optional(),
  model: z.string().trim().optional(),
  quantity: z.number().int().positive("Quantity must be at least 1."),
  unitCost: z.union([z.string(), z.number()]),
  purpose: z.string().trim().optional(),
  suggestedDealer: z.string().trim().optional(),
  supplierId: z.string().uuid().optional(),
});

export const createPurchaseOrderSchema = z.object({
  poNumber: z.string().trim().max(100).optional(),
  poDate: z.string().min(1, "Order date is required."),
  requestedBy: z.string().trim().min(1, "Requested by is required."),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().trim().optional(),
  departmentId: z.string().uuid().optional(),
  departmentName: z.string().trim().max(255).optional(),
  purpose: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  receiptUrl: z.string().trim().nullable().optional(),
  status: purchaseOrderStatusSchema.default("pending_approval"),
  items: z
    .array(createPurchaseOrderItemSchema)
    .min(1, "Please provide at least one line item."),
});

export const updatePurchaseOrderStatusSchema = z.object({
  status: purchaseOrderStatusSchema,
  notes: z.string().trim().max(2000).optional(),
  receiptUrl: z.string().trim().nullable().optional(),
  approvedBy: z.string().trim().max(255).optional(),
  /** Actual qty received on deliver (consumables). Defaults to ordered qty when omitted. */
  receivedQuantity: z.number().int().positive().optional(),
});

export const updatePurchaseOrderSchema = z.object({
  poNumber: z.string().trim().max(100).nullable().optional(),
  supplierId: z.string().uuid().nullable().optional(),
  supplierName: z.string().trim().nullable().optional(),
  reference: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  purpose: z.string().trim().nullable().optional(),
  receiptUrl: z.string().trim().nullable().optional(),
  purchasedOn: z.string().optional(),
  recordedByName: z.string().trim().nullable().optional(),
});

/** Staff scan: release qty from a supplier purchase lot. */
export const scanReleaseLotSchema = z
  .object({
    code: z.string().trim().min(1, "code (QR payload or lot code) is required."),
    quantity: z.number().int().positive("quantity must be positive."),
    reason: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(2000).optional(),
    recipientName: z.string().trim().max(255).optional(),
    departmentId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
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

export type ListPurchaseLotsQuery = z.infer<typeof listPurchaseLotsQuerySchema>;
export type CreatePurchaseOrderBody = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderStatusBody = z.infer<
  typeof updatePurchaseOrderStatusSchema
>;
export type UpdatePurchaseOrderBody = z.infer<typeof updatePurchaseOrderSchema>;
export type ScanReleaseLotBody = z.infer<typeof scanReleaseLotSchema>;
