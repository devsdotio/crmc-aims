import { supplierController } from "@/server/modules/suppliers";

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: List vendors
 *     tags: [Suppliers]
 *   post:
 *     summary: Create a vendor
 *     tags: [Suppliers]
 */
export async function GET(request: Request) {
  return supplierController.list(request);
}

export async function POST(request: Request) {
  return supplierController.create(request);
}
