import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.")
  .optional()
  .nullable();

export const createIndicatorSchema = z.object({
  title: z.string().trim().min(1, "Milestone / indicator title is required.").max(255),
  description: z.string().trim().max(2000).optional().nullable(),
  targetDate: dateSchema,
  orderIndex: z.number().int().optional().default(0),
});

export const updateIndicatorSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    targetDate: dateSchema,
    isCompleted: z.boolean().optional(),
    orderIndex: z.number().int().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required to update.",
  });

export const toggleIndicatorSchema = z.object({
  isCompleted: z.boolean(),
});

export const indicatorIdSchema = z.string().uuid("Invalid indicator ID.");

export type CreateIndicatorInput = z.infer<typeof createIndicatorSchema>;
export type UpdateIndicatorInput = z.infer<typeof updateIndicatorSchema>;
export type ToggleIndicatorInput = z.infer<typeof toggleIndicatorSchema>;
