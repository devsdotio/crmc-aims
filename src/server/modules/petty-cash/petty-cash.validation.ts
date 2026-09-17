import { z } from "zod";

export const PETTY_CASH_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "completed",
  "cancelled",
] as const;

export const listPettyCashQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(PETTY_CASH_STATUSES).optional(),
  category: z.string().trim().max(50).optional(),
  departmentId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const createPettyCashSchema = z.object({
  /** Hybrid code e.g. PCV2026-000001 (or auto-generated if omitted) */
  pcvNumber: z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable(),
  status: z.enum(PETTY_CASH_STATUSES).optional().default("draft"),
  voucherDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Voucher date must be YYYY-MM-DD"),
  payeeName: z.string().trim().min(1, "Payee / Claimant name is required.").max(255),
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => String(Number(val) || 0))
    .refine((val) => Number(val) >= 0, "Amount must be a non-negative number."),
  category: z.string().trim().min(1).max(100).default("supplies"),
  particulars: z.string().trim().max(4000).optional().default(""),
  receiptNumber: z.string().trim().max(100).optional().nullable(),
  purchaseOrderNumber: z.string().trim().max(100).optional().nullable(),
  supplierId: z.string().uuid("Invalid supplier ID").optional().nullable(),
  supplierName: z.string().trim().max(255).optional().nullable(),
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  departmentName: z.string().trim().max(255).optional().nullable(),
  isLegacy: z.boolean().optional().default(false),
});

export const updatePettyCashSchema = z
  .object({
    pcvNumber: z.string().trim().max(50).optional(),
    payeeName: z.string().trim().min(1).max(255).optional(),
    voucherDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Voucher date must be YYYY-MM-DD")
      .optional(),
    amount: z
      .union([z.string(), z.number()])
      .transform((val) => String(Number(val) || 0))
      .refine((val) => Number(val) >= 0, "Amount must be a non-negative number.")
      .optional(),
    category: z.string().trim().min(1).max(100).optional(),
    particulars: z.string().trim().max(4000).optional(),
    receiptNumber: z.string().trim().max(100).optional().nullable(),
    purchaseOrderNumber: z.string().trim().max(100).optional().nullable(),
    supplierId: z.string().uuid("Invalid supplier ID").optional().nullable(),
    supplierName: z.string().trim().max(255).optional().nullable(),
    departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
    departmentName: z.string().trim().max(255).optional().nullable(),
    isLegacy: z.boolean().optional(),
  })
  .strict();

export const updatePettyCashStatusSchema = z.object({
  status: z.enum(PETTY_CASH_STATUSES, {
    message: "Invalid status value",
  }),
});

export const pettyCashIdSchema = z.string().uuid("Invalid Petty Cash ID format");
