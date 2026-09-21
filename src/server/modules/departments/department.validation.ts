import { z } from "zod";

const departmentCodeSchema = z
  .string()
  .trim()
  .min(2, "Department code must be at least 2 characters.")
  .max(16, "Department code is too long.")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
    "Code may only contain letters, numbers, hyphens, and underscores."
  )
  .transform((value) => value.toUpperCase());

export const listDepartmentsQuerySchema = z.object({
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

export const createDepartmentSchema = z.object({
  code: departmentCodeSchema,
  name: z.string().trim().min(1, "Department name is required.").max(120),
  isSandbox: z.boolean().optional(),
});

export const updateDepartmentSchema = z
  .object({
    code: departmentCodeSchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    isSandbox: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required to update a department.",
  });

export const departmentIdSchema = z.string().uuid("Invalid department id.");

export type CreateDepartmentBody = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentBody = z.infer<typeof updateDepartmentSchema>;
