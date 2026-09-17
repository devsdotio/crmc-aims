import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireSuperAdmin } from "@/server/shared/auth";
import { getCachedTenantById, getCachedTenantBySlug } from "@/server/shared/tenant-context";
import { TENANT_COOKIE_NAME } from "@/lib/tenant/resolve-request-tenant";

const switchTenantSchema = z.object({
  tenantIdOrSlug: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const { tenantIdOrSlug } = switchTenantSchema.parse(body);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdOrSlug);
    const tenant = isUuid
      ? await getCachedTenantById(tenantIdOrSlug)
      : await getCachedTenantBySlug(tenantIdOrSlug);

    if (!tenant) {
      return NextResponse.json({ error: "Institution not found." }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
    });

    response.cookies.set(TENANT_COOKIE_NAME, tenant.id, {
      path: "/",
      sameSite: "lax",
      httpOnly: false, // accessible to client UI
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to switch tenant.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
