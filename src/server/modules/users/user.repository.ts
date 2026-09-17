import { and, asc, eq, ilike, isNull, lt, or } from "drizzle-orm";

import { getDb } from "@/server/db";
import {
  departments,
  profiles,
  type NewProfileRow,
  type ProfileRow,
} from "@/server/db/schema";

import type {
  IProfileRepository,
  ListUsersFilters,
  ProfileWithDepartment,
} from "./user.types";

/** Minimum interval between last-active writes for the same user. */
const LAST_ACTIVE_TOUCH_MS = 5 * 60 * 1000;

type JoinedRow = {
  profile: ProfileRow;
  linkedDepartmentName: string | null;
  linkedDepartmentCode: string | null;
};

function flatten(row: JoinedRow): ProfileWithDepartment {
  return {
    ...row.profile,
    linkedDepartmentName: row.linkedDepartmentName,
    linkedDepartmentCode: row.linkedDepartmentCode,
  };
}

export class ProfileRepository implements IProfileRepository {
  private joinedSelect() {
    const db = getDb();
    return db
      .select({
        profile: profiles,
        linkedDepartmentName: departments.name,
        linkedDepartmentCode: departments.code,
      })
      .from(profiles)
      .leftJoin(departments, eq(profiles.departmentId, departments.id));
  }

  async findByUserId(userId: string): Promise<ProfileWithDepartment | null> {
    const [row] = await this.joinedSelect()
      .where(eq(profiles.userId, userId))
      .limit(1);
    return row ? flatten(row) : null;
  }

  async findByEmail(email: string): Promise<ProfileWithDepartment | null> {
    const [row] = await this.joinedSelect()
      .where(eq(profiles.email, email.toLowerCase()))
      .limit(1);
    return row ? flatten(row) : null;
  }

  async findBorrowerByDepartmentId(
    departmentId: string,
    tenantId?: string
  ): Promise<ProfileRow | null> {
    const db = getDb();
    const conditions = [
      eq(profiles.departmentId, departmentId),
      eq(profiles.role, "borrower"),
    ];
    if (tenantId) {
      conditions.push(eq(profiles.tenantId, tenantId));
    }
    const [row] = await db
      .select()
      .from(profiles)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async list(filters: ListUsersFilters = {}): Promise<ProfileWithDepartment[]> {
    const conditions = [];

    if (filters.role) {
      conditions.push(eq(profiles.role, filters.role));
    }
    if (filters.status) {
      conditions.push(eq(profiles.status, filters.status));
    }
    if (filters.tenantId && filters.tenantId !== "all") {
      conditions.push(eq(profiles.tenantId, filters.tenantId));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(ilike(profiles.fullName, q), ilike(profiles.email, q))!
      );
    }

    const query =
      conditions.length === 0
        ? this.joinedSelect().orderBy(asc(profiles.fullName))
        : this.joinedSelect()
            .where(and(...conditions))
            .orderBy(asc(profiles.fullName));

    const rows = await query;
    return rows.map(flatten);
  }

  async create(data: NewProfileRow): Promise<ProfileRow> {
    const db = getDb();
    const [row] = await db.insert(profiles).values(data).returning();
    if (!row) {
      throw new Error("Failed to create profile: no row returned.");
    }
    return row;
  }

  async update(
    userId: string,
    data: Partial<Omit<ProfileRow, "userId" | "createdAt">>
  ): Promise<ProfileRow | null> {
    const db = getDb();
    const [row] = await db
      .update(profiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();
    return row ?? null;
  }

  /**
   * Records recent activity. Throttled to avoid a write on every request.
   * Callers should treat failures as best-effort.
   */
  async touchLastActive(userId: string): Promise<void> {
    const db = getDb();
    const now = new Date();
    const threshold = new Date(now.getTime() - LAST_ACTIVE_TOUCH_MS);

    await db
      .update(profiles)
      .set({ lastActiveAt: now })
      .where(
        and(
          eq(profiles.userId, userId),
          or(isNull(profiles.lastActiveAt), lt(profiles.lastActiveAt, threshold))
        )
      );
  }
}
