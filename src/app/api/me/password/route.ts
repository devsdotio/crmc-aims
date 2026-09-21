import { userController } from "@/server/modules/users";

/**
 * @swagger
 * /api/me/password:
 *   post:
 *     summary: Change the current user's password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password updated
 *       401:
 *         description: Current password is incorrect or not authenticated
 */
export async function POST(request: Request) {
  return userController.changePassword(request);
}
