import { authController } from "@/server/modules/auth";

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Current authenticated profile
 *     description: |
 *       Returns the application profile for the caller (session cookie or
 *       `Authorization: Bearer` JWT from sign-in / OAuth2 token).
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Active application profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [superadmin, admin, staff, borrower]
 *                     status:
 *                       type: string
 *                       enum: [active, deactivated]
 *                     department:
 *                       type: string
 *                       nullable: true
 *                     dateAdded:
 *                       type: string
 *                     lastActive:
 *                       type: string
 *                       nullable: true
 *                     lastActiveAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     createdByUserId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: No profile or deactivated
 */
export async function GET() {
  return authController.me();
}
