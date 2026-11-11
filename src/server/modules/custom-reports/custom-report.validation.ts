import { z } from "zod";

import { isSafeLogoUrl } from "@/lib/html";
import { CUSTOM_REPORT_DATASETS } from "@/types/custom-reports";

const layoutBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "header",
    "title",
    "text",
    "filters_summary",
    "table",
    "footer",
    "signatories",
    "page_break",
  ]),
  props: z
    .object({
      logoUrl: z
        .string()
        .trim()
        .refine((v) => !v || isSafeLogoUrl(v), {
          message:
            "Logo URL must be a relative path (/...), safe PNG/JPEG/WebP data URI, or an allowed HTTPS origin.",
        })
        .optional(),
      orgName: z.string().optional(),
      orgSubtitle: z.string().optional(),
      title: z.string().optional(),
      periodLabel: z.string().optional(),
      text: z.string().optional(),
      footerText: z.string().optional(),
      signatories: z
        .array(
          z.object({
            name: z.string(),
            role: z.string(),
            title: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
});

const stringList = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((value) => {
    if (value == null || value === "") return undefined;
    if (Array.isArray(value)) {
      const out = value.map(String).map((s) => s.trim()).filter(Boolean);
      return out.length ? out : undefined;
    }
    const out = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return out.length ? out : undefined;
  });

const runtimeStringList = z
  .union([z.array(z.string()), z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return [];
    if (Array.isArray(value)) {
      return value.map(String).map((s) => s.trim()).filter(Boolean);
    }
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  });

const filtersObjectSchema = z.object({
  search: z.string().optional(),
  departmentIds: stringList,
  departmentNames: stringList,
  projectIds: stringList,
  categories: stringList,
  classifications: stringList,
  categoryClasses: stringList,
  statuses: stringList,
  assignmentTypes: stringList,
  itemTypes: stringList,
  requestTypes: stringList,
  assetIds: stringList,
  consumableIds: stringList,
  conditions: stringList,
  reasons: stringList,
  directions: stringList,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  // legacy singles
  departmentId: z.string().optional(),
  department: z.string().optional(),
  category: z.string().optional(),
  classification: z.string().optional(),
  status: z.string().optional(),
});

const runtimeFiltersObjectSchema = z.object({
  search: z.union([z.string(), z.null()]).optional(),
  departmentIds: runtimeStringList,
  departmentNames: runtimeStringList,
  projectIds: runtimeStringList,
  categories: runtimeStringList,
  classifications: runtimeStringList,
  categoryClasses: runtimeStringList,
  statuses: runtimeStringList,
  assignmentTypes: runtimeStringList,
  itemTypes: runtimeStringList,
  requestTypes: runtimeStringList,
  assetIds: runtimeStringList,
  consumableIds: runtimeStringList,
  conditions: runtimeStringList,
  reasons: runtimeStringList,
  directions: runtimeStringList,
  startDate: z.union([z.string(), z.null()]).optional(),
  endDate: z.union([z.string(), z.null()]).optional(),
  // legacy singles
  departmentId: z.union([z.string(), z.null()]).optional(),
  department: z.union([z.string(), z.null()]).optional(),
  category: z.union([z.string(), z.null()]).optional(),
  classification: z.union([z.string(), z.null()]).optional(),
  status: z.union([z.string(), z.null()]).optional(),
});

export const filtersSchema = z.preprocess(
  (value) => value ?? {},
  filtersObjectSchema
);

export const runtimeFiltersSchema = z.preprocess(
  (value) => value ?? {},
  runtimeFiltersObjectSchema
);

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  dataset: z.enum(CUSTOM_REPORT_DATASETS),
  columns: z.array(z.string().min(1)).min(1).max(50),
  defaultFilters: filtersSchema.optional(),
  layout: z.array(layoutBlockSchema).optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  dataset: z.enum(CUSTOM_REPORT_DATASETS).optional(),
  columns: z.array(z.string().min(1)).min(1).max(50).optional(),
  defaultFilters: filtersSchema.optional(),
  layout: z.array(layoutBlockSchema).optional(),
});

export const runReportSchema = z.object({
  templateId: z.string().uuid().optional(),
  dataset: z.enum(CUSTOM_REPORT_DATASETS).optional(),
  columns: z.array(z.string().min(1)).min(1).max(50).optional(),
  filters: runtimeFiltersSchema.optional(),
  layout: z.array(layoutBlockSchema).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(2000).default(100),
});

export const exportReportBodySchema = z.object({
  templateId: z.string().uuid(),
  filters: runtimeFiltersSchema.optional(),
});

export const printIntentSchema = z.object({
  templateId: z.string().uuid(),
  filters: runtimeFiltersSchema.optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type RunReportInput = z.infer<typeof runReportSchema>;
export type ExportReportBody = z.infer<typeof exportReportBodySchema>;
