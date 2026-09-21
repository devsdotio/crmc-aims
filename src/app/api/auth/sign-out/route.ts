import { authController } from "@/server/modules/auth";

/**
 * @swagger
 * /api/auth/sign-out:
 *   post:
 *     summary: Sign out current session
 *     description: Clears the Supabase session cookies for this client.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Session cleared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     signedOut:
 *                       type: boolean
 *                       example: true
 */
export async function POST() {
  return authController.signOut();
}
