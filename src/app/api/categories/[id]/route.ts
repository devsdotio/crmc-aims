import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { categories } from "@/server/db/schema";
import { requireActor } from "@/server/shared/auth";
import {
  CategoryRepository,
  type CategoryType,
} from "@/server/modules/categories/category.repository";
import { handleError } from "@/server/shared/http";
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireActor();
    const categoryRepo = new CategoryRepository();
    const existing = await categoryRepo.findById(id, undefined, actor.tenantId);

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const canManage =
      actor.role === "admin" ||
      actor.role === "superadmin" ||
      existing.createdByUserId === actor.userId;

    if (!canManage) {
      return NextResponse.json(
        { error: "You do not have permission to update this category" },
        { status: 403 }
      );
    }

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

    const newName = String(body.name).trim();
    let parentId: string | null | undefined = undefined;
    if (body.parentId !== undefined) {
      parentId =
        typeof body.parentId === "string" && body.parentId.trim()
          ? body.parentId.trim()
          : null;
    }

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
      if (parent.id === id) {
        return NextResponse.json(
          { error: "A category cannot be its own parent." },
          { status: 400 }
        );
      }
    }

    if (body.type === "consumable" && parentId) {
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
      if (parent.id === id) {
        return NextResponse.json(
          { error: "A category cannot be its own parent." },
          { status: 400 }
        );
      }
    }

    if (
      body.type !== "asset" &&
      body.type !== "consumable" &&
      parentId !== undefined
    ) {
      parentId = null;
    }

    // Check if renaming conflicts with another category of same type
    const conflict = await categoryRepo.findByTypeAndName(
      body.type,
      newName,
      undefined,
      actor.tenantId
    );
    if (conflict && conflict.id !== id) {
      return NextResponse.json(
        { error: `Category “${newName}” already exists for this type.` },
        { status: 409 }
      );
    }

    const updated = await categoryRepo.updateAndCascade(
      id,
      {
        name: newName,
        type: body.type,
        colorToken:
          body.colorToken !== undefined ? body.colorToken || null : undefined,
        iconToken:
          body.iconToken !== undefined ? body.iconToken || null : undefined,
        ...(parentId !== undefined ? { parentId } : {}),
      },
      undefined,
      actor.tenantId
    );

    if (!updated) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    serverCache.invalidateTag("categories");
    serverCache.invalidateTag(`tenant:${actor.tenantId}:categories`);

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireActor();
    const categoryRepo = new CategoryRepository();
    const existing = await categoryRepo.findById(id, undefined, actor.tenantId);

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const canManage =
      actor.role === "admin" ||
      actor.role === "superadmin" ||
      existing.createdByUserId === actor.userId;

    if (!canManage) {
      return NextResponse.json(
        { error: "You do not have permission to delete this category" },
        { status: 403 }
      );
    }

    const type = existing.type as CategoryType;

    if (type === "asset_class" || type === "consumable_class") {
      const childCount = await categoryRepo.countChildCategories(
        existing.id,
        undefined,
        actor.tenantId
      );
      if (childCount > 0) {
        const kind =
          type === "asset_class" ? "specific asset" : "specific consumable";
        return NextResponse.json(
          {
            error: `Cannot delete classification “${existing.name}” because ${childCount} ${kind} categor${
              childCount === 1 ? "y is" : "ies are"
            } linked to it. Reassign or delete those categories first.`,
          },
          { status: 409 }
        );
      }
    }

    const usageCount = await categoryRepo.countUsages(
      existing.name,
      type,
      undefined,
      actor.tenantId
    );

    if (usageCount > 0) {
      const itemLabel =
        type === "asset"
          ? "asset(s)"
          : type === "asset_class"
            ? "asset(s) using this classification"
            : type === "consumable_class"
              ? "supply item(s) using this classification"
              : "supply item(s)";
      return NextResponse.json(
        {
          error: `Cannot delete category “${existing.name}” because it is currently assigned to ${usageCount} ${itemLabel}. Reassign or delete those items first.`,
        },
        { status: 409 }
      );
    }

    const db = getDb();
    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.tenantId, actor.tenantId)));

    serverCache.invalidateTag("categories");
    serverCache.invalidateTag(`tenant:${actor.tenantId}:categories`);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleError(error);
  }
}
