import { z } from "zod";

export const SUPPLIER_STATUSES = ["active", "inactive"] as const;

export const listSuppliersQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(SUPPLIER_STATUSES).optional(),
  activeOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
});

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required.").max(255),
  contactName: z.string().trim().max(255).optional().nullable(),
  contactEmail: z
    .string()
    .trim()
    .email("Invalid email.")
    .max(320)
    .optional()
    .nullable()
    .or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(SUPPLIER_STATUSES).optional().default("active"),
});

export const updateSupplierSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    contactName: z.string().trim().max(255).optional().nullable(),
    contactEmail: z
      .string()
      .trim()
      .email("Invalid email.")
      .max(320)
      .optional()
      .nullable()
      .or(z.literal("")),
    contactPhone: z.string().trim().max(40).optional().nullable(),
    address: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(4000).optional().nullable(),
    status: z.enum(SUPPLIER_STATUSES).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required to update a supplier.",
  });

export const supplierIdSchema = z.string().uuid("Invalid supplier id.");

export type CreateSupplierBody = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierBody = z.infer<typeof updateSupplierSchema>;
