import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { categories } from "@/server/db/schema";
import { requireActor } from "@/server/shared/auth";
import { CategoryRepository, type CategoryType } from "@/server/modules/categories/category.repository";
import { handleError } from "@/server/shared/http";
import { serverCache } from "@/server/shared/cache";

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
      return NextResponse.json({ error: "Missing required fields: name, type" }, { status: 400 });
    }

    if (body.type !== "asset" && body.type !== "consumable") {
      return NextResponse.json(
        { error: "type must be asset or consumable" },
        { status: 400 }
      );
    }

    const newName = String(body.name).trim();

    // Check if renaming conflicts with another category of same type
    const conflict = await categoryRepo.findByTypeAndName(
      body.type as CategoryType,
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

    const updated = await categoryRepo.updateAndCascade(id, {
      name: newName,
      type: body.type as CategoryType,
      colorToken: body.colorToken !== undefined ? body.colorToken || null : undefined,
    }, undefined, actor.tenantId);

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

    const usageCount = await categoryRepo.countUsages(
      existing.name,
      existing.type as CategoryType,
      undefined,
      actor.tenantId
    );

    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category “${existing.name}” because it is currently assigned to ${usageCount} ${
            existing.type === "asset" ? "asset(s)" : "supply item(s)"
          }. Reassign or delete those items first.`,
        },
        { status: 409 }
      );
    }

    const db = getDb();
    await db.delete(categories).where(and(eq(categories.id, id), eq(categories.tenantId, actor.tenantId)));

    serverCache.invalidateTag("categories");
    serverCache.invalidateTag(`tenant:${actor.tenantId}:categories`);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleError(error);
  }
}
