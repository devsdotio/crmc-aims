import { NextResponse } from "next/server";
import { count, eq, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import { profiles, tenants } from "@/server/db/schema";
import { requireSuperAdmin } from "@/server/shared/auth";

export async function GET() {
  try {
    await requireSuperAdmin();
    const db = getDb();

    const [
      userCountResult,
      roleCounts,
      statusCounts,
      allTenants,
      tenantUserCounts,
      adminProfiles,
    ] = await Promise.all([
      db.select({ count: count(profiles.userId) }).from(profiles).then((rows) => rows[0]),
      db
        .select({
          role: profiles.role,
          count: count(profiles.userId),
        })
        .from(profiles)
        .groupBy(profiles.role),
      db
        .select({
          status: profiles.status,
          count: count(profiles.userId),
        })
        .from(profiles)
        .groupBy(profiles.status),
      db.select().from(tenants).orderBy(sql`${tenants.createdAt} DESC`),
      db
        .select({
          tenantId: profiles.tenantId,
          count: count(profiles.userId),
        })
        .from(profiles)
        .groupBy(profiles.tenantId),
      db
        .select({
          tenantId: profiles.tenantId,
          fullName: profiles.fullName,
          email: profiles.email,
        })
        .from(profiles)
        .where(eq(profiles.role, "admin")),
    ]);

    const totalInstitutions = allTenants.length;
    const totalUsers = Number(userCountResult?.count ?? 0);

    const roles = {
      superadmin: 0,
      admin: 0,
      staff: 0,
      borrower: 0,
    };
    for (const row of roleCounts) {
      if (row.role in roles) {
        roles[row.role as keyof typeof roles] = Number(row.count);
      }
    }

    const statuses = {
      active: 0,
      deactivated: 0,
    };
    for (const row of statusCounts) {
      if (row.status in statuses) {
        statuses[row.status as keyof typeof statuses] = Number(row.count);
      }
    }

    const userCountByTenant = new Map<string, number>();
    for (const row of tenantUserCounts) {
      if (row.tenantId) {
        userCountByTenant.set(row.tenantId, Number(row.count));
      }
    }

    const adminByTenant = new Map<string, { fullName: string; email: string }>();
    for (const adm of adminProfiles) {
      if (adm.tenantId && !adminByTenant.has(adm.tenantId)) {
        adminByTenant.set(adm.tenantId, {
          fullName: adm.fullName,
          email: adm.email,
        });
      }
    }

    const institutions = allTenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      createdAt: t.createdAt,
      userCount: userCountByTenant.get(t.id) ?? 0,
      admin: adminByTenant.get(t.id) ?? null,
    }));

    return NextResponse.json({
      data: {
        totalInstitutions,
        totalUsers,
        roles,
        statuses,
        institutions,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load platform metrics.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
