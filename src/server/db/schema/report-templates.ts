import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { tenants } from "./tenants";
import type {
  CustomReportColumnKey,
  CustomReportDataset,
  CustomReportFilters,
  CustomReportLayoutBlock,
} from "@/types/custom-reports";

/**
 * Tenant-owned custom report definitions (dataset + columns + filters + layout).
 * Separate from the Beta `/reports` suite — do not couple to that module.
 */
export const reportTemplates = pgTable(
  "report_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),

    name: text("name").notNull(),
    description: text("description"),

    /** Allowlisted dataset key: assets | consumables | … */
    dataset: text("dataset").$type<CustomReportDataset>().notNull(),

    /** Ordered allowlisted field keys. */
    columns: jsonb("columns")
      .$type<CustomReportColumnKey[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    defaultFilters: jsonb("default_filters")
      .$type<CustomReportFilters>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    layout: jsonb("layout")
      .$type<CustomReportLayoutBlock[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    createdByUserId: uuid("created_by_user_id"),
    createdByName: text("created_by_name"),
    updatedByUserId: uuid("updated_by_user_id"),
    updatedByName: text("updated_by_name"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("report_templates_tenant_id_idx").on(table.tenantId),
    index("report_templates_dataset_idx").on(table.dataset),
  ]
);

export type ReportTemplateRow = typeof reportTemplates.$inferSelect;
export type NewReportTemplateRow = typeof reportTemplates.$inferInsert;
