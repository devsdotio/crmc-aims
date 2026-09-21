import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { categories } from "@/server/db/schema";
import { requireActor } from "@/server/shared/auth";
import { CategoryRepository } from "@/server/modules/categories/category.repository";
import { handleError, okWithEtag } from "@/server/shared/http";
import { serverCache } from "@/server/shared/cache";

/**
 * Institutional category taxonomy (Settings).
 * Lists all asset + consumable categories for the org with real item counts.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    const categoryRepo = new CategoryRepository();
    const rows = await serverCache.wrap(
      `tenant:${actor.tenantId}:categories:type:${type ?? "all"}`,
      10 * 60 * 1000,
      () =>
        categoryRepo.listWithCounts(
          type === "asset" || type === "consumable" ? type : undefined,
          undefined,
          actor.tenantId
        ),
      ["categories", `tenant:${actor.tenantId}:categories`]
    );

    return okWithEtag(request, rows, {
      cacheControl: { maxAge: 60, staleWhileRevalidate: 300 },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    const db = getDb();
    const body = await request.json();

    if (!body.name?.trim() || !body.type) {
      return NextResponse.json(
        { error: "Missing required fields: name, type" },
        { status: 400 }
      );
    }

    if (body.type !== "asset" && body.type !== "consumable") {
      return NextResponse.json(
        { error: "type must be asset or consumable" },
        { status: 400 }
      );
    }

    const name = String(body.name).trim();

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, actor.tenantId),
          eq(categories.type, body.type),
          sql`lower(${categories.name}) = lower(${name})`
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: `Category “${name}” already exists for this type.` },
        { status: 409 }
      );
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        tenantId: actor.tenantId,
        name,
        description: body.description || null,
        type: body.type,
        colorToken: body.colorToken || null,
        createdByUserId: actor.userId,
      })
      .returning();

    serverCache.invalidateTag(`tenant:${actor.tenantId}:categories`);
    serverCache.invalidateTag("categories");

    return NextResponse.json(
      {
        data: {
          id: newCategory.id,
          name: newCategory.name,
          type: newCategory.type,
          colorToken: newCategory.colorToken || undefined,
          itemCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
