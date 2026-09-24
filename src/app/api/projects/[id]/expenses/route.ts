import { NextResponse } from "next/server";

import { requireUserManager } from "@/server/shared/auth";
import { handleError, noContent, ok } from "@/server/shared/http";
import { ProjectExpenseService } from "@/server/modules/projects/project-expense.service";
import { projectController } from "@/server/modules/projects";

/**
 * Collection route for project expenses.
 *
 * PATCH/DELETE target a line via `?expenseId=` — Turbopack in this app does not
 * reliably compile the nested `expenses/[expenseId]` segment (requests 404),
 * while this parent route is registered and works.
 *
 * @swagger
 * /api/projects/{id}/expenses:
 *   get:
 *     summary: List project expense lines
 *     tags: [Projects]
 *   post:
 *     summary: Add a misc / adjustment expense line
 *     tags: [Projects]
 *   patch:
 *     summary: Update a project expense line (`expenseId` query)
 *     tags: [Projects]
 *   delete:
 *     summary: Delete a project expense line (`expenseId` query)
 *     tags: [Projects]
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return projectController.listExpenses(id);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return projectController.createExpense(request, id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;
    const expenseId = new URL(request.url).searchParams.get("expenseId");
    if (!expenseId) {
      return NextResponse.json(
        { error: "Query parameter expenseId is required." },
        { status: 400 }
      );
    }
    const session = await requireUserManager();
    const body = await request.json();
    const updated = await new ProjectExpenseService().update(
      projectId,
      expenseId,
      body,
      session.actor
    );
    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;
    const expenseId = new URL(request.url).searchParams.get("expenseId");
    if (!expenseId) {
      return NextResponse.json(
        { error: "Query parameter expenseId is required." },
        { status: 400 }
      );
    }
    const session = await requireUserManager();
    await new ProjectExpenseService().delete(
      projectId,
      expenseId,
      session.actor
    );
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
