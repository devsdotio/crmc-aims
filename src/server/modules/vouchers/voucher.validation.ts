import { z } from "zod";

export const VOUCHER_TYPES = [
  "disbursement",
  "property_transfer",
  "liquidation",
] as const;

export const VOUCHER_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "completed",
  "cancelled",
] as const;

export const listVouchersQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  type: z.enum(VOUCHER_TYPES).optional(),
  status: z.enum(VOUCHER_STATUSES).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const createVoucherSchema = z.object({
  /** Hybrid code e.g. DDR2026-000428 (or auto-generated if omitted) */
  voucherCode: z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable(),
  type: z.enum(VOUCHER_TYPES).default("disbursement"),
  status: z.enum(VOUCHER_STATUSES).optional().default("draft"),
  voucherDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Voucher date must be YYYY-MM-DD"),
  payeeName: z.string().trim().min(1, "Payee name is required.").max(255),
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => String(Number(val) || 0))
    .refine((val) => Number(val) >= 0, "Amount must be a non-negative number."),
  supplierId: z.string().uuid("Invalid supplier ID").optional().nullable(),
  supplierName: z.string().trim().max(255).optional().nullable(),
  purchaseOrderNumber: z.string().trim().max(100).optional().nullable(),
  assetId: z.string().uuid("Invalid asset ID").optional().nullable(),
  assetCode: z.string().trim().max(100).optional().nullable(),
  assetName: z.string().trim().max(255).optional().nullable(),
  particulars: z.string().trim().max(4000).optional().default(""),
  checkNumber: z.string().trim().max(100).optional().nullable(),
  isLegacy: z.boolean().optional().default(false),
});

export const updateVoucherSchema = z
  .object({
    voucherCode: z.string().trim().max(50).optional(),
    payeeName: z.string().trim().min(1).max(255).optional(),
    voucherDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Voucher date must be YYYY-MM-DD")
      .optional(),
    amount: z
      .union([z.string(), z.number()])
      .transform((val) => String(Number(val) || 0))
      .optional(),
    supplierId: z.string().uuid().optional().nullable(),
    supplierName: z.string().trim().max(255).optional().nullable(),
    purchaseOrderNumber: z.string().trim().max(100).optional().nullable(),
    assetId: z.string().uuid().optional().nullable(),
    assetCode: z.string().trim().max(100).optional().nullable(),
    assetName: z.string().trim().max(255).optional().nullable(),
    particulars: z.string().trim().max(4000).optional(),
    checkNumber: z.string().trim().max(100).optional().nullable(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required to update a voucher.",
  });

export const updateVoucherStatusSchema = z.object({
  status: z.enum(VOUCHER_STATUSES),
  notes: z.string().trim().max(1000).optional(),
});

export const voucherIdSchema = z.string().uuid("Invalid voucher ID.");

export type CreateVoucherBody = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherBody = z.infer<typeof updateVoucherSchema>;
export type UpdateVoucherStatusBody = z.infer<typeof updateVoucherStatusSchema>;
