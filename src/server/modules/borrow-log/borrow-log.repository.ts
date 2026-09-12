import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import {
  assets,
  borrowTransactions,
  type BorrowTransactionRow,
  type NewBorrowTransactionRow,
} from "@/server/db/schema";
import { todayDateString } from "@/server/shared/codes";

import type {
  IBorrowLogRepository,
  ListBorrowLogFilters,
} from "./borrow-log.types";

export class BorrowLogRepository implements IBorrowLogRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(
    id: string,
    session?: DbSession
  ): Promise<BorrowTransactionRow | null> {
    const db = this.db(session);
    const [row] = await db
      .select()
      .from(borrowTransactions)
      .where(eq(borrowTransactions.id, id))
      .limit(1);
    return row ?? null;
  }

  async findByIdForUpdate(
    id: string,
    session: DbSession
  ): Promise<BorrowTransactionRow | null> {
    const [row] = await session
      .select()
      .from(borrowTransactions)
      .where(eq(borrowTransactions.id, id))
      .for("update")
      .limit(1);
    return row ?? null;
  }

  async findActiveByAssetId(
    assetId: string,
    session?: DbSession
  ): Promise<BorrowTransactionRow | null> {
    const db = this.db(session);
    const [row] = await db
      .select()
      .from(borrowTransactions)
      .where(
        and(
          eq(borrowTransactions.assetId, assetId),
          eq(borrowTransactions.status, "active")
        )
      )
      .limit(1);
    return row ?? null;
  }

  /** Holder display names for active custody logs, keyed by asset id. */
  async findActiveHolderLabelsByAssetIds(
    assetIds: string[],
    session?: DbSession
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (assetIds.length === 0) return out;

    const db = this.db(session);
    const rows = await db
      .select({
        assetId: borrowTransactions.assetId,
        borrowerName: borrowTransactions.borrowerName,
      })
      .from(borrowTransactions)
      .where(
        and(
          inArray(borrowTransactions.assetId, assetIds),
          eq(borrowTransactions.status, "active")
        )
      );

    for (const row of rows) {
      if (row.assetId) out.set(row.assetId, row.borrowerName);
    }
    return out;
  }

  async list(
    filters: ListBorrowLogFilters = {},
    session?: DbSession
  ): Promise<BorrowTransactionRow[]> {
    const db = this.db(session);
    const conditions = [];
    const today = todayDateString();

    if (filters.heldOnly) {
      conditions.push(eq(borrowTransactions.status, "active"));
    } else if (filters.status === "returned") {
      conditions.push(eq(borrowTransactions.status, "returned"));
    } else if (filters.status === "voided") {
      conditions.push(eq(borrowTransactions.status, "voided"));
    } else if (filters.status === "active") {
      conditions.push(eq(borrowTransactions.status, "active"));
      conditions.push(
        or(
          sql`${borrowTransactions.dueDate} IS NULL`,
          sql`${borrowTransactions.dueDate} >= ${today}`
        )!
      );
    } else if (filters.status === "overdue") {
      conditions.push(eq(borrowTransactions.status, "active"));
      conditions.push(isNotNull(borrowTransactions.dueDate));
      conditions.push(lt(borrowTransactions.dueDate, today));
    }

    if (filters.custodyKind && filters.custodyKind !== "all") {
      conditions.push(eq(borrowTransactions.custodyKind, filters.custodyKind));
    } else if (!filters.custodyKind) {
      conditions.push(eq(borrowTransactions.custodyKind, "borrow"));
    }

    if (filters.departmentId) {
      conditions.push(eq(borrowTransactions.departmentId, filters.departmentId));
    } else if (filters.department?.trim()) {
      conditions.push(eq(borrowTransactions.department, filters.department.trim()));
    }

    if (filters.excludeProjects) {
      conditions.push(isNull(borrowTransactions.projectId));
    }

    if (filters.borrowerUserId && filters.borrowerEmail) {
      conditions.push(
        or(
          eq(borrowTransactions.borrowerUserId, filters.borrowerUserId),
          ilike(borrowTransactions.borrowerEmail, filters.borrowerEmail.trim())
        )!
      );
    } else if (filters.borrowerUserId) {
      conditions.push(eq(borrowTransactions.borrowerUserId, filters.borrowerUserId));
    } else if (filters.borrowerEmail) {
      conditions.push(ilike(borrowTransactions.borrowerEmail, filters.borrowerEmail.trim()));
    }
    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(borrowTransactions.borrowerName, q),
          ilike(borrowTransactions.logCode, q),
          ilike(borrowTransactions.assetCode, q),
          ilike(borrowTransactions.assetName, q),
          ilike(borrowTransactions.requestCode, q)
        )!
      );
    }
    if (!filters.includeSandbox) {
      conditions.push(
        sql`not exists (select 1 from assets a where a.id = ${borrowTransactions.assetId} and a.is_sandbox = true)`
      );
      conditions.push(
        sql`(${borrowTransactions.departmentId} is null OR not exists (select 1 from departments d where d.id = ${borrowTransactions.departmentId} and d.is_sandbox = true))`
      );
    }

    const base = db
      .select()
      .from(borrowTransactions)
      .orderBy(desc(borrowTransactions.releasedAt));

    if (conditions.length === 0) return base;
    return base.where(and(...conditions));
  }

  async countActive(
    session?: DbSession,
    userId?: string,
    custodyKind: "borrow" | "assignment" = "borrow"
  ): Promise<number> {
    const db = this.db(session);
    const conditions = [
      eq(borrowTransactions.status, "active"),
      eq(borrowTransactions.custodyKind, custodyKind),
      // Dashboard counts always exclude sandbox assets
      sql`not exists (select 1 from assets a where a.id = ${borrowTransactions.assetId} and a.is_sandbox = true)`,
    ];
    if (userId) conditions.push(eq(borrowTransactions.borrowerUserId, userId));
    const [row] = await db
      .select({ value: count() })
      .from(borrowTransactions)
      .leftJoin(assets, eq(assets.id, borrowTransactions.assetId))
      .where(
        and(
          ...conditions,
          custodyKind === "borrow"
            ? or(
                eq(assets.assignmentType, "borrowable"),
                sql`${assets.id} IS NULL`
              )
            : eq(assets.assignmentType, "assignable")
        )
      );
    return Number(row?.value ?? 0);
  }

  /**
   * Open department custody (borrow + assignment-to-dept), excluding projects.
   * Used by requester dashboard / inventory counts.
   */
  async countDepartmentHeld(
    departmentId: string,
    options?: {
      overdueOnly?: boolean;
      includeSandbox?: boolean;
      session?: DbSession;
    }
  ): Promise<number> {
    const db = this.db(options?.session);
    const today = todayDateString();
    const conditions = [
      eq(borrowTransactions.status, "active"),
      eq(borrowTransactions.departmentId, departmentId),
      isNull(borrowTransactions.projectId),
    ];

    if (options?.overdueOnly) {
      conditions.push(isNotNull(borrowTransactions.dueDate));
      conditions.push(lt(borrowTransactions.dueDate, today));
    }

    if (!options?.includeSandbox) {
      conditions.push(
        sql`not exists (select 1 from assets a where a.id = ${borrowTransactions.assetId} and a.is_sandbox = true)`
      );
    }

    const [row] = await db
      .select({ value: count() })
      .from(borrowTransactions)
      .where(and(...conditions));
    return Number(row?.value ?? 0);
  }

  async countOverdue(session?: DbSession, userId?: string): Promise<number> {
    const db = this.db(session);
    const today = todayDateString();
    const conditions = [
      eq(borrowTransactions.status, "active"),
      eq(borrowTransactions.custodyKind, "borrow"),
      isNotNull(borrowTransactions.dueDate),
      lt(borrowTransactions.dueDate, today),
      // Dashboard counts always exclude sandbox assets
      sql`not exists (select 1 from assets a where a.id = ${borrowTransactions.assetId} and a.is_sandbox = true)`,
    ];
    if (userId) conditions.push(eq(borrowTransactions.borrowerUserId, userId));
    const [row] = await db
      .select({ value: count() })
      .from(borrowTransactions)
      .leftJoin(assets, eq(assets.id, borrowTransactions.assetId))
      .where(
        and(
          ...conditions,
          or(
            eq(assets.assignmentType, "borrowable"),
            sql`${assets.id} IS NULL`
          )
        )
      );
    return Number(row?.value ?? 0);
  }

  async countYear(session?: DbSession): Promise<number> {
    const db = this.db(session);
    const [row] = await db
      .select({ value: count() })
      .from(borrowTransactions)
      .where(
        sql`extract(year from ${borrowTransactions.createdAt}) = extract(year from now())`
      );
    return Number(row?.value ?? 0);
  }

  async create(
    data: Omit<NewBorrowTransactionRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<BorrowTransactionRow> {
    const db = this.db(session);
    const [row] = await db.insert(borrowTransactions).values(data).returning();
    if (!row) throw new Error("Failed to create borrow log.");
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<BorrowTransactionRow, "id" | "createdAt" | "logCode">>,
    session?: DbSession
  ): Promise<BorrowTransactionRow | null> {
    const db = this.db(session);
    const [row] = await db
      .update(borrowTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(borrowTransactions.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string, session?: DbSession): Promise<boolean> {
    const db = this.db(session);
    const result = await db
      .delete(borrowTransactions)
      .where(eq(borrowTransactions.id, id))
      .returning({ id: borrowTransactions.id });
    return result.length > 0;
  }
}
