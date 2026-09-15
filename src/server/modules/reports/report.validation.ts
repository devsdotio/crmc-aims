import { z } from "zod";

export const reportTypeSchema = z.enum([
  "executive",
  "assets",
  "asset-drilldown",
  "consumables",
  "purchase-orders",
  "requests",
  "maintenance",
  "projects",
  "departments",
]);

export const reportSortOrderSchema = z.enum(["asc", "desc"]);

export const baseReportQuerySchema = z.object({
  search: z.string().optional(),
  departmentId: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sortBy: z.string().optional(),
  sortOrder: reportSortOrderSchema.default("desc"),
  includeSandbox: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((val) => val === "true" || val === "1"),
});

export const exportReportQuerySchema = baseReportQuerySchema.extend({
  reportType: reportTypeSchema,
  format: z.enum(["csv", "pdf"]).default("csv"),
});

export type BaseReportQuery = z.infer<typeof baseReportQuerySchema>;
export type ExportReportQuery = z.infer<typeof exportReportQuerySchema>;
