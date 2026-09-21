import { consumableRequestController } from "@/server/modules/consumable-requests";

/**
 * @swagger
 * /api/consumable-requests:
 *   get:
 *     summary: List consumable requests (multi-product issue queue)
 *     tags: [ConsumableRequests]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, released, cancelled]
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated request list with line items
 *   post:
 *     summary: Create a multi-line consumable request
 *     tags: [ConsumableRequests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requesterName, requesterEmail, department, purpose, lines]
 *             properties:
 *               requesterName: { type: string }
 *               requesterEmail: { type: string }
 *               requesterPhone: { type: string }
 *               department: { type: string }
 *               purpose: { type: string }
 *               notes: { type: string }
 *               lines:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [consumableId, quantity]
 *                   properties:
 *                     consumableId: { type: string, format: uuid }
 *                     quantity: { type: integer, minimum: 1 }
 *                     notes: { type: string }
 *     responses:
 *       201:
 *         description: Request created (pending; no stock deducted)
 */
export async function GET(request: Request) {
  return consumableRequestController.list(request);
}

export async function POST(request: Request) {
  return consumableRequestController.create(request);
}
