import { z } from "zod";

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
      logoUrl: z.string().optional(),
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

const filtersObjectSchema = z.object({
  search: z.string().optional(),
  departmentIds: stringList,
  departmentNames: stringList,
  projectIds: stringList,
  categories: stringList,
  classifications: stringList,
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

export const filtersSchema = z.preprocess(
  (value) => value ?? {},
  filtersObjectSchema
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
  filters: filtersSchema.optional(),
  layout: z.array(layoutBlockSchema).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(2000).default(100),
});

export const exportReportBodySchema = z.object({
  templateId: z.string().uuid(),
  filters: filtersSchema.optional(),
});

export const printIntentSchema = z.object({
  templateId: z.string().uuid(),
  filters: filtersSchema.optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type RunReportInput = z.infer<typeof runReportSchema>;
export type ExportReportBody = z.infer<typeof exportReportBodySchema>;
