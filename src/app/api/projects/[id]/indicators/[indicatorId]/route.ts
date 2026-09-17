import { requireActor } from "@/server/shared/auth";
import { handleError, noContent, ok } from "@/server/shared/http";
import { ProjectProgressService } from "@/server/modules/projects/project-progress.service";

const progressService = new ProjectProgressService();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; indicatorId: string }> }
) {
  try {
    const actor = await requireActor();
    const { id: projectId, indicatorId } = await context.params;
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
  _request: Request,
  context: { params: Promise<{ id: string; indicatorId: string }> }
) {
  try {
    const actor = await requireActor();
    const { id: projectId, indicatorId } = await context.params;
    await progressService.deleteIndicator(projectId, indicatorId, actor);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
