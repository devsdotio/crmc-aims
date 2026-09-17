import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import type { DbSession } from "@/server/db/transaction";
import { getTenantContext } from "@/server/shared/tenant-context";
import {
  vouchers,
  type NewVoucherRow,
  type VoucherRow,
} from "@/server/db/schema";

import type { IVoucherRepository, ListVoucherFilters } from "./voucher.types";

export class VoucherRepository implements IVoucherRepository {
  private db(session?: DbSession) {
    return session ?? getDb();
  }

  async findById(id: string, session?: DbSession): Promise<VoucherRow | null> {
    const db = this.db(session);
    const [row] = await db
      .select()
      .from(vouchers)
      .where(eq(vouchers.id, id))
      .limit(1);
    return row ?? null;
  }

  async findByCode(code: string, session?: DbSession): Promise<VoucherRow | null> {
    const db = this.db(session);
    const [row] = await db
      .select()
      .from(vouchers)
      .where(eq(vouchers.voucherCode, code))
      .limit(1);
    return row ?? null;
  }

  async list(
    filters: ListVoucherFilters = {},
    session?: DbSession
  ): Promise<{ vouchers: VoucherRow[]; total: number }> {
    const db = this.db(session);
    const conditions = [];

    if (filters.type) {
      conditions.push(eq(vouchers.type, filters.type));
    }

    if (filters.status) {
      conditions.push(eq(vouchers.status, filters.status));
    }

    if (filters.startDate) {
      conditions.push(gte(vouchers.voucherDate, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(vouchers.voucherDate, filters.endDate));
    }

    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(vouchers.voucherCode, q),
          ilike(vouchers.payeeName, q),
          ilike(vouchers.supplierName, q),
          ilike(vouchers.purchaseOrderNumber, q),
          ilike(vouchers.assetCode, q),
          ilike(vouchers.assetName, q),
          ilike(vouchers.particulars, q),
          ilike(vouchers.checkNumber, q)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vouchers)
      .where(whereClause);

    const query = db
      .select()
      .from(vouchers)
      .where(whereClause)
      .orderBy(desc(vouchers.createdAt))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);

    const rows = await query;

    return {
      vouchers: rows,
      total: totalCount?.count ?? 0,
    };
  }

  async create(
    data: Omit<NewVoucherRow, "id" | "createdAt" | "updatedAt">,
    session?: DbSession
  ): Promise<VoucherRow> {
    const db = this.db(session);
    const [row] = await db.insert(vouchers).values(data).returning();
    if (!row) throw new Error("Failed to create voucher.");
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<VoucherRow, "id" | "createdAt">>,
    session?: DbSession
  ): Promise<VoucherRow | null> {
    const db = this.db(session);
    const [row] = await db
      .update(vouchers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vouchers.id, id))
      .returning();
    return row ?? null;
  }

  async findLatestVoucherCode(
    prefix: string,
    session?: DbSession,
    tenantId?: string
  ): Promise<string | null> {
    const db = this.db(session);
    const resolvedTenantId = tenantId ?? getTenantContext()?.tenantId;

    const conditions = [ilike(vouchers.voucherCode, `${prefix}%`)];
    if (resolvedTenantId) {
      conditions.push(eq(vouchers.tenantId, resolvedTenantId));
    }

    const rows = await db
      .select({ voucherCode: vouchers.voucherCode })
      .from(vouchers)
      .where(and(...conditions))
      .orderBy(desc(vouchers.createdAt))
      .limit(100);

    if (!rows.length) return null;

    let maxNum = 0;
    let latestCode: string | null = null;

    for (const r of rows) {
      const suffix = r.voucherCode.slice(prefix.length);
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
        latestCode = r.voucherCode;
      }
    }

    return latestCode ?? rows[0]?.voucherCode ?? null;
  }

  async delete(id: string, session?: DbSession): Promise<boolean> {
    const db = this.db(session);
    const result = await db.delete(vouchers).where(eq(vouchers.id, id)).returning();
    return result.length > 0;
  }
}

