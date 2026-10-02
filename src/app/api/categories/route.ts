import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { categories } from "@/server/db/schema";
import { requireActor } from "@/server/shared/auth";
import {
  CategoryRepository,
  type CategoryType,
} from "@/server/modules/categories/category.repository";
import { appErrorFromUnknown, ConflictError } from "@/server/shared/errors";
import { handleError, okWithEtag } from "@/server/shared/http";
import { serverCache } from "@/server/shared/cache";

const VALID_TYPES: CategoryType[] = [
  "asset",
  "consumable",
  "asset_class",
  "consumable_class",
];

function isCategoryType(value: unknown): value is CategoryType {
  return typeof value === "string" && (VALID_TYPES as string[]).includes(value);
}

/**
 * Institutional category taxonomy (Settings).
 * Lists asset/consumable classes and specific categories with counts.
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
          isCategoryType(type) ? type : undefined,
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

    if (!isCategoryType(body.type)) {
      return NextResponse.json(
        {
          error:
            "type must be asset, consumable, asset_class, or consumable_class",
        },
        { status: 400 }
      );
    }

    const name = String(body.name).trim();
    let parentId: string | null =
      typeof body.parentId === "string" && body.parentId.trim()
        ? body.parentId.trim()
        : null;

    if (
      (body.type === "asset_class" || body.type === "consumable_class") &&
      parentId
    ) {
      return NextResponse.json(
        { error: "General classifications cannot have a parent category." },
        { status: 400 }
      );
    }

    if (body.type === "asset" && parentId) {
      const categoryRepo = new CategoryRepository();
      const parent = await categoryRepo.findById(
        parentId,
        undefined,
        actor.tenantId
      );
      if (!parent || parent.type !== "asset_class") {
        return NextResponse.json(
          {
            error:
              "parentId must reference an existing Asset Classification (type=asset_class).",
          },
          { status: 400 }
        );
      }
    }

    if (body.type === "consumable" && parentId) {
      const categoryRepo = new CategoryRepository();
      const parent = await categoryRepo.findById(
        parentId,
        undefined,
        actor.tenantId
      );
      if (!parent || parent.type !== "consumable_class") {
        return NextResponse.json(
          {
            error:
              "parentId must reference an existing Consumable Classification (type=consumable_class).",
          },
          { status: 400 }
        );
      }
    }

    if (body.type !== "asset" && body.type !== "consumable") {
      parentId = null;
    }

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

    let newCategory;
    try {
      [newCategory] = await db
        .insert(categories)
        .values({
          tenantId: actor.tenantId,
          name,
          description: body.description || null,
          type: body.type,
          colorToken: body.colorToken || null,
          parentId,
          createdByUserId: actor.userId,
        })
        .returning();
    } catch (error) {
      const mapped = appErrorFromUnknown(error);
      if (mapped instanceof ConflictError) {
        throw new ConflictError(
          `Category “${name}” already exists for this type.`
        );
      }
      throw error;
    }

    let parentName: string | null = null;
    if (newCategory.parentId) {
      const categoryRepo = new CategoryRepository();
      const parent = await categoryRepo.findById(
        newCategory.parentId,
        undefined,
        actor.tenantId
      );
      parentName = parent?.name ?? null;
    }

    serverCache.invalidateTag(`tenant:${actor.tenantId}:categories`);
    serverCache.invalidateTag("categories");

    return NextResponse.json(
      {
        data: {
          id: newCategory.id,
          name: newCategory.name,
          type: newCategory.type,
          colorToken: newCategory.colorToken || undefined,
          parentId: newCategory.parentId ?? null,
          parentName,
          itemCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
