import { assetController } from "@/server/modules/assets";

/**
 * @swagger
 * /api/assets/bulk:
 *   post:
 *     summary: Register a product model + N QR-tagged units
 *     description: |
 *       Creates an asset model (e.g. Epson 310 Printer) and mints `quantity`
 *       individual units with codes `{codePrefix}-001` … Each unit gets its own
 *       QR payload `CRMC-AIMS:{assetCode}` for staff mobile release/return.
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [modelCode, name, category, location, quantity]
 *             properties:
 *               modelCode:
 *                 type: string
 *                 example: PRT-EPSON-310
 *               name:
 *                 type: string
 *                 example: Epson 310 Printer
 *               category:
 *                 type: string
 *               location:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 500
 *                 example: 30
 *               codePrefix:
 *                 type: string
 *                 example: PRT-310
 *               unitValue:
 *                 type: number
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               assignmentType:
 *                 type: string
 *                 enum: [borrowable, assignable]
 *     responses:
 *       201:
 *         description: Model + units created
 *       400:
 *         description: Invalid payload
 *       409:
 *         description: Code collision
 */
export async function POST(request: Request) {
  return assetController.bulkCreate(request);
}
