import { purchaseLotController } from "@/server/modules/purchase-lots";

/**
 * TEMPORARY: atomic delete of all lines for a PO with inventory revert.
 * DELETE /api/purchase-lots/by-po?poNumber=…
 */
export async function DELETE(request: Request) {
  return purchaseLotController.deleteByPo(request);
}
