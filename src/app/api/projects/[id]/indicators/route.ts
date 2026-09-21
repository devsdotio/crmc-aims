import { NextResponse } from "next/server";

import { requireActor } from "@/server/shared/auth";
import { handleError, noContent, ok } from "@/server/shared/http";
import { ProjectProgressService } from "@/server/modules/projects/project-progress.service";

const progressService = new ProjectProgressService();

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor();
    const { id } = await context.params;
    const data = await progressService.getProgressSummary(id, actor);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor();
    const { id } = await context.params;
    const body = await request.json();
    const data = await progressService.createIndicator(id, body, actor);
    return ok(data, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor();
    const { id: projectId } = await context.params;
    const url = new URL(request.url);
    const indicatorId = url.searchParams.get("indicatorId");
    if (!indicatorId) {
      return NextResponse.json(
        { error: "Query parameter indicatorId is required." },
        { status: 400 }
      );
    }
    const body = await request.json();
    if ("isCompleted" in body && Object.keys(body).length === 1) {
      const data = await progressService.toggleCompletion(
        projectId,
        indicatorId,
        body,
        actor
      );
      return ok(data);
    }
    const data = await progressService.updateIndicator(
      projectId,
      indicatorId,
      body,
      actor
    );
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor();
    const { id: projectId } = await context.params;
    const indicatorId = new URL(request.url).searchParams.get("indicatorId");
    if (!indicatorId) {
      return NextResponse.json(
        { error: "Query parameter indicatorId is required." },
        { status: 400 }
      );
    }
    await progressService.deleteIndicator(projectId, indicatorId, actor);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
