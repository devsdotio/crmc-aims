import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/server/db";
import {
  tenants,
  profiles,
  departments,
  categories,
} from "@/server/db/schema";
import { requireSuperAdmin } from "@/server/shared/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidateTenantCache } from "@/server/shared/tenant-context";

const onboardTenantSchema = z.object({
  name: z.string().min(2, "Institution name must be at least 2 characters."),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters.")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase alphanumeric characters and hyphens."),
  adminName: z.string().min(2, "Administrator name must be at least 2 characters."),
  adminEmail: z.string().email("Valid email required for tenant administrator."),
  adminPassword: z.string().min(8, "Password must be at least 8 characters."),
  seedStarterData: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const body = await request.json();
    const input = onboardTenantSchema.parse(body);

    const db = getDb();
    const normalizedSlug = input.slug.toLowerCase().trim();
    const normalizedEmail = input.adminEmail.toLowerCase().trim();

    // 1. Check if slug is already taken
    const [existingTenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, normalizedSlug))
      .limit(1);

    if (existingTenant) {
      return NextResponse.json(
        { error: `Institution slug "${normalizedSlug}" is already registered.` },
        { status: 400 }
      );
    }

    // 2. Check if admin email is already registered in profiles
    const [existingProfile] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.email, normalizedEmail))
      .limit(1);

    if (existingProfile) {
      return NextResponse.json(
        { error: `Email "${normalizedEmail}" is already associated with an account.` },
        { status: 400 }
      );
    }

    // 3. Create Tenant Record
    const [newTenant] = await db
      .insert(tenants)
      .values({
        name: input.name.trim(),
        slug: normalizedSlug,
        branding: {
          institutionName: input.name.trim(),
          primaryColor: "#2A3260",
        },
        settings: {
          allowSandbox: false,
          enableRealtime: true,
        },
      })
      .returning();

    if (!newTenant) {
      throw new Error("Failed to create institution record.");
    }

    // 4. Create Initial Tenant Administrator in Supabase Auth
    const supabaseAdmin = createAdminClient();
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: input.adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: input.adminName.trim(),
          tenant_id: newTenant.id,
          tenant_slug: newTenant.slug,
        },
      });

    if (authError || !authUser?.user) {
      // Roll back tenant if auth fails
      await db.delete(tenants).where(eq(tenants.id, newTenant.id));
      throw new Error(authError?.message || "Failed to provision administrator auth account.");
    }

    // 5. Create Profile Record
    try {
      await db.insert(profiles).values({
        userId: authUser.user.id,
        tenantId: newTenant.id,
        email: normalizedEmail,
        fullName: input.adminName.trim(),
        role: "admin",
        status: "active",
        createdByUserId: session.actor.userId,
      });
    } catch (profileErr) {
      // Cleanup auth user and tenant on profile failure
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await db.delete(tenants).where(eq(tenants.id, newTenant.id));
      throw profileErr;
    }

    // 6. Optional Starter Data Seeding (Departments & Categories)
    if (input.seedStarterData) {
      try {
        // Default Administration department
        await db.insert(departments).values({
          tenantId: newTenant.id,
          code: "ADMIN",
          name: "General Administration",
          isSandbox: false,
        });

        // Baseline categories
        await db.insert(categories).values([
          {
            tenantId: newTenant.id,
            name: "IT & Electronics",
            type: "asset",
            description: "Computers, projectors, networking gear, and lab electronics",
            colorToken: "blue",
          },
          {
            tenantId: newTenant.id,
            name: "Equipment & Machinery",
            type: "asset",
            description: "Heavy machinery, lab tools, and instructional apparatus",
            colorToken: "emerald",
          },
          {
            tenantId: newTenant.id,
            name: "Furniture & Fixtures",
            type: "asset",
            description: "Desks, executive chairs, conference tables, and cabinets",
            colorToken: "amber",
          },
          {
            tenantId: newTenant.id,
            name: "Office & Classroom Supplies",
            type: "consumable",
            description: "Paper, ink cartridges, markers, and stationery",
            colorToken: "purple",
          },
        ]);
      } catch (seedErr) {
        console.warn("Starter data seeding warning (tenant was still created successfully):", seedErr);
      }
    }

    // 7. Invalidate caches
    invalidateTenantCache(newTenant.id, newTenant.slug);

    return NextResponse.json(
      {
        success: true,
        data: {
          tenant: {
            id: newTenant.id,
            name: newTenant.name,
            slug: newTenant.slug,
          },
          admin: {
            id: authUser.user.id,
            name: input.adminName.trim(),
            email: normalizedEmail,
            role: "admin",
          },
          starterDataSeeded: input.seedStarterData,
          onboardedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to onboard institution.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
