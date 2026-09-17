import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  pettyCashVouchers,
  type NewPettyCashRow,
  type PettyCashRow,
} from "@/server/db/schema";

import type { IPettyCashRepository, ListPettyCashFilters } from "./petty-cash.types";

export class PettyCashRepository implements IPettyCashRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(
    id: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<PettyCashRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(pettyCashVouchers.id, id)];
    if (resolvedTenantId) conditions.push(eq(pettyCashVouchers.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(pettyCashVouchers)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async findByCode(
    code: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<PettyCashRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(pettyCashVouchers.pcvNumber, code)];
    if (resolvedTenantId) conditions.push(eq(pettyCashVouchers.tenantId, resolvedTenantId));

    const [row] = await db
      .select()
      .from(pettyCashVouchers)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  async list(
    filters: ListPettyCashFilters = {},
    session?: DbSession,
    tenantId?: string
  ): Promise<{ vouchers: PettyCashRow[]; total: number }> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [];

    if (resolvedTenantId) {
      conditions.push(eq(pettyCashVouchers.tenantId, resolvedTenantId));
    }

    if (filters.status) {
      conditions.push(eq(pettyCashVouchers.status, filters.status));
    }

    if (filters.category) {
      conditions.push(eq(pettyCashVouchers.category, filters.category));
    }

    if (filters.departmentId) {
      conditions.push(eq(pettyCashVouchers.departmentId, filters.departmentId));
    }

    if (filters.startDate) {
      conditions.push(gte(pettyCashVouchers.voucherDate, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(pettyCashVouchers.voucherDate, filters.endDate));
    }

    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(pettyCashVouchers.pcvNumber, q),
          ilike(pettyCashVouchers.payeeName, q),
          ilike(pettyCashVouchers.category, q),
          ilike(pettyCashVouchers.purpose, q),
          ilike(pettyCashVouchers.particulars, q),
          ilike(pettyCashVouchers.receiptNumber, q),
          ilike(pettyCashVouchers.purchaseOrderNumber, q),
          ilike(pettyCashVouchers.supplierName, q),
          ilike(pettyCashVouchers.departmentName, q)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pettyCashVouchers)
      .where(whereClause);

    const query = db
      .select()
      .from(pettyCashVouchers)
      .where(whereClause)
      .orderBy(desc(pettyCashVouchers.createdAt))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);

    const rows = await query;

    return {
      vouchers: rows,
      total: totalCount?.count ?? 0,
    };
  }

  async create(
    data: Omit<NewPettyCashRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<PettyCashRow> {
    const db = this.db(session);
    const resolvedTenantId =
      (data as { tenantId?: string }).tenantId ?? getTenantContext()?.tenantId;
    const [row] = await db
      .insert(pettyCashVouchers)
      .values({
        ...data,
        ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}),
      })
      .returning();
    if (!row) throw new Error("Failed to create petty cash voucher.");
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<PettyCashRow, "id" | "createdAt">>,
    session?: DbSession,
    tenantId?: string
  ): Promise<PettyCashRow | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(pettyCashVouchers.id, id)];
    if (resolvedTenantId) conditions.push(eq(pettyCashVouchers.tenantId, resolvedTenantId));

    const [row] = await db
      .update(pettyCashVouchers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return row ?? null;
  }

  async findLatestPcvCode(
    prefix: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<string | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;

    const conditions = [ilike(pettyCashVouchers.pcvNumber, `${prefix}%`)];
    if (resolvedTenantId) {
      conditions.push(eq(pettyCashVouchers.tenantId, resolvedTenantId));
    }

    const rows = await db
      .select({ pcvNumber: pettyCashVouchers.pcvNumber })
      .from(pettyCashVouchers)
      .where(and(...conditions))
      .orderBy(desc(pettyCashVouchers.createdAt))
      .limit(100);

    if (!rows.length) return null;

    let maxNum = 0;
    let latestCode: string | null = null;

    for (const r of rows) {
      const suffix = r.pcvNumber.slice(prefix.length);
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
        latestCode = r.pcvNumber;
      }
    }

    return latestCode ?? rows[0]?.pcvNumber ?? null;
  }

  async delete(
    id: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<boolean> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;
    const conditions = [eq(pettyCashVouchers.id, id)];
    if (resolvedTenantId) conditions.push(eq(pettyCashVouchers.tenantId, resolvedTenantId));

    const result = await db.delete(pettyCashVouchers).where(and(...conditions)).returning();
    return result.length > 0;
  }
}
