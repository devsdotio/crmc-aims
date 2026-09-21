import { requireActor } from "@/server/shared/auth";
import { handleError, ok } from "@/server/shared/http";
import { ProjectExpenseService } from "@/server/modules/projects/project-expense.service";

const expenseService = new ProjectExpenseService();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor();
    const { id } = await context.params;
    const body = await request.json();
    const lines = await expenseService.createBatchManualMaterials(
      id,
      body,
      actor
    );
    return ok(lines, 201);
  } catch (error) {
    return handleError(error);
  }
}
