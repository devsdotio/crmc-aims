import { z } from "zod";

export const PROJECT_STATUSES = [
  "draft",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.")
  .optional()
  .nullable();

const moneySchema = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((value, ctx) => {
    if (value === undefined || value === null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Budget must be a non-negative amount.",
      });
      return z.NEVER;
    }
    return n.toFixed(2);
  });

export const listProjectsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required.").max(255),
  description: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(PROJECT_STATUSES).optional().default("active"),
  location: z.string().trim().max(255).optional().nullable(),
  department: z.string().trim().max(255).optional().nullable(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  budget: moneySchema,
  notes: z.string().trim().max(4000).optional().nullable(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(4000).optional().nullable(),
    status: z.enum(PROJECT_STATUSES).optional(),
    location: z.string().trim().max(255).optional().nullable(),
    department: z.string().trim().max(255).optional().nullable(),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    budget: moneySchema,
    notes: z.string().trim().max(4000).optional().nullable(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required to update a project.",
  });

export const projectIdSchema = z.string().uuid("Invalid project id.");

export type CreateProjectBody = z.infer<typeof createProjectSchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
