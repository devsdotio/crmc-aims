import {
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Daily metric snapshot table for historical telemetry and period-over-period
 * delta calculations (e.g. 30-day percentage changes on compact stat cards).
 */
export const dashboardMetricSnapshots = pgTable(
  "dashboard_metric_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    metricKey: text("metric_key").notNull(),
    value: numeric("value", { precision: 14, scale: 2 }).notNull(),
    snapshotDate: date("snapshot_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("dashboard_metric_snapshots_key_date_idx").on(
      table.metricKey,
      table.snapshotDate
    ),
    index("dashboard_metric_snapshots_date_idx").on(table.snapshotDate),
  ]
);

export type DashboardMetricSnapshotRow =
  typeof dashboardMetricSnapshots.$inferSelect;
export type NewDashboardMetricSnapshotRow =
  typeof dashboardMetricSnapshots.$inferInsert;
