import { requireActor } from "@/server/shared/auth";
import { handleError, ok } from "@/server/shared/http";
import { ProjectProgressService } from "@/server/modules/projects/project-progress.service";

const progressService = new ProjectProgressService();

/** Batch lean progress counts for the projects table (avoids N+1 per row). */
export async function GET() {
  try {
    const actor = await requireActor();
    const data = await progressService.getProgressCountsForProjects(actor);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}
