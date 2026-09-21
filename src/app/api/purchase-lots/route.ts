import { purchaseLotController } from "@/server/modules/purchase-lots";

/**
 * @swagger
 * /api/purchase-lots:
 *   get:
 *     summary: List purchase orders / cost lots
 *     tags: [PurchaseLots]
 *   post:
 *     summary: Create new purchase order with multi-line items
 *     tags: [PurchaseLots]
 */
export async function GET(request: Request) {
  return purchaseLotController.list(request);
}

export async function POST(request: Request) {
  return purchaseLotController.create(request);
}
