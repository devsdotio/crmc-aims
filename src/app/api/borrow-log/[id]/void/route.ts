import { borrowLogController } from "@/server/modules/borrow-log";

type Params = { params: Promise<{ id: string }> };

/**
 * Soft-void (undo) a mistaken active manual custody issue.
 * Restores the asset to stock; keeps the log row for audit.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return borrowLogController.voidLog(request, id);
}
