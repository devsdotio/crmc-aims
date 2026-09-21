import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

import { departments } from "./departments";
import { tenants } from "./tenants";

/**
 * Application profiles linked 1:1 to Supabase Auth users.
 *
 * Roles:
 * - superadmin — developers (seeded; not grantable via normal admin UI)
 * - admin — creates staff/borrower accounts, manages users
 * - staff — browse-only in the ops shell this phase (no asset/inventory mutations)
 * - borrower — department login (one account per department; not a named person)
 *
 * There is no public self-signup. Accounts are provisioned via the service-role
 * admin API (+ a row in this table).
 */
export const appRoleEnum = pgEnum("app_role", [
  "superadmin",
  "admin",
  "staff",
  "borrower",
]);

export const profileStatusEnum = pgEnum("profile_status", [
  "active",
  "deactivated",
]);


export const profiles = pgTable(
  "profiles",
  {
    /** Same UUID as auth.users.id */
    userId: uuid("user_id").primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id),

    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    role: appRoleEnum("role").notNull().default("staff"),
    status: profileStatusEnum("status").notNull().default("active"),
    /** Denormalized department name for display / legacy request rows. */
    department: text("department"),
    /** Required for role = borrower. Source of truth for department accounts. */
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "restrict",
    }),

    /** Staff who provisioned this account (null for seed/superadmin bootstrap). */
    createdByUserId: uuid("created_by_user_id"),

    /**
     * Last time this user hit an authenticated app route / API.
     * Null until first successful session after account creation.
     */
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("profiles_role_idx").on(table.role),
    index("profiles_status_idx").on(table.status),
    index("profiles_email_idx").on(table.email),
    index("profiles_last_active_at_idx").on(table.lastActiveAt),
    index("profiles_department_id_idx").on(table.departmentId),
    uniqueIndex("profiles_one_borrower_per_department_idx")
      .on(table.tenantId, table.departmentId)
      .where(sql`${table.role} = 'borrower' AND ${table.departmentId} is not null`),
  ]
);

export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;
