import { authController } from "@/server/modules/auth";
import { userController } from "@/server/modules/users";

/**
 * @swagger
 * /api/me:
 *   get:
 *     summary: Current authenticated profile (alias of GET /api/auth/me)
 *     description: Kept for existing client hooks. Prefer `/api/auth/me` for new work.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Active application profile
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: No profile or deactivated
 *   patch:
 *     summary: Update the current user's profile (name, department)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               department:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated profile
 *       401:
 *         description: Not authenticated
 */
export async function GET() {
  return authController.me();
}

export async function PATCH(request: Request) {
  return userController.updateMe(request);
}
