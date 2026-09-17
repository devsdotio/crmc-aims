import { NextResponse } from "next/server";
import { count, eq, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import { profiles, tenants } from "@/server/db/schema";
import { requireSuperAdmin } from "@/server/shared/auth";

export async function GET() {
  try {
    await requireSuperAdmin();
    const db = getDb();

    // 1. Total institutions
    const [tenantCountResult] = await db
      .select({ count: count(tenants.id) })
      .from(tenants);
    const totalInstitutions = Number(tenantCountResult?.count ?? 0);

    // 2. Total users
    const [userCountResult] = await db
      .select({ count: count(profiles.userId) })
      .from(profiles);
    const totalUsers = Number(userCountResult?.count ?? 0);

    // 3. Role breakdown
    const roleCounts = await db
      .select({
        role: profiles.role,
        count: count(profiles.userId),
      })
      .from(profiles)
      .groupBy(profiles.role);

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

    // 4. Status breakdown
    const statusCounts = await db
      .select({
        status: profiles.status,
        count: count(profiles.userId),
      })
      .from(profiles)
      .groupBy(profiles.status);

    const statuses = {
      active: 0,
      deactivated: 0,
    };
    for (const row of statusCounts) {
      if (row.status in statuses) {
        statuses[row.status as keyof typeof statuses] = Number(row.count);
      }
    }

    // 5. Detailed institutions with user count
    const allTenants = await db
      .select()
      .from(tenants)
      .orderBy(sql`${tenants.createdAt} DESC`);

    const tenantUserCounts = await db
      .select({
        tenantId: profiles.tenantId,
        count: count(profiles.userId),
      })
      .from(profiles)
      .groupBy(profiles.tenantId);

    const userCountByTenant = new Map<string, number>();
    for (const row of tenantUserCounts) {
      if (row.tenantId) {
        userCountByTenant.set(row.tenantId, Number(row.count));
      }
    }

    // Find primary admin per tenant
    const adminProfiles = await db
      .select({
        tenantId: profiles.tenantId,
        fullName: profiles.fullName,
        email: profiles.email,
      })
      .from(profiles)
      .where(eq(profiles.role, "admin"));

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
