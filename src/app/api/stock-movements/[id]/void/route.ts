import { stockMovementController } from "@/server/modules/stock-movements";

type Params = { params: Promise<{ id: string }> };

/**
 * Soft-undo a mistaken consumable issue: restocks on-hand + lot remaining,
 * writes a compensating MOV restock, keeps the original issue for audit.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return stockMovementController.voidIssue(request, id);
}
