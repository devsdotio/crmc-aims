import { purchaseLotController } from "@/server/modules/purchase-lots";

/**
 * TEMPORARY: preview inventory/asset effects of deleting an entire PO.
 * GET /api/purchase-lots/delete-impact?poNumber=…
 */
export async function GET(request: Request) {
  return purchaseLotController.deleteImpact(request);
}
