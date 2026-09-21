import { NextResponse, type NextRequest } from "next/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/server/db";
import { tenants } from "@/server/db/schema";
import { requireSuperAdmin } from "@/server/shared/auth";
import { invalidateTenantCache } from "@/server/shared/tenant-context";

const createTenantSchema = z.object({
  name: z.string().min(2, "Institution name must be at least 2 characters."),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters.")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase alphanumeric characters and hyphens."),
  branding: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const db = getDb();
    const rows = await db
      .select()
      .from(tenants)
      .orderBy(desc(tenants.createdAt));

    return NextResponse.json({ data: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load tenants.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const parsed = createTenantSchema.parse(body);

    const db = getDb();
    const existing = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, parsed.slug.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Tenant slug "${parsed.slug}" is already registered.` },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(tenants)
      .values({
        name: parsed.name,
        slug: parsed.slug.toLowerCase(),
        branding: parsed.branding ?? null,
        settings: parsed.settings ?? null,
      })
      .returning();

    invalidateTenantCache(created.id, created.slug);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create tenant.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
