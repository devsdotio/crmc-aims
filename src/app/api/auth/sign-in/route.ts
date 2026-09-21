import { authController } from "@/server/modules/auth";

/**
 * @swagger
 * /api/auth/sign-in:
 *   post:
 *     summary: Sign in with email and password
 *     description: |
 *       Authenticates against Supabase Auth and returns the application profile
 *       plus a session. Also sets HTTP-only Supabase cookies for browser clients.
 *
 *       **Swagger / API clients:** copy `data.session.accessToken` into
 *       **Authorize → Bearer (API Key)** (or use the OAuth2 password flow
 *       against `/api/auth/token`).
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: crmc.custodian@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: custodianadmin
 *               rememberMe:
 *                 type: boolean
 *                 description: When true, keep the session across browser restarts. When false, session cookies end when the browser closes.
 *                 default: false
 *     responses:
 *       200:
 *         description: Authenticated session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                     profile:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         role:
 *                           type: string
 *                           enum: [superadmin, admin, staff, borrower]
 *                         status:
 *                           type: string
 *                           enum: [active, deactivated]
 *                         department:
 *                           type: string
 *                           nullable: true
 *                     session:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           description: JWT for Authorization Bearer header
 *                         refreshToken:
 *                           type: string
 *                           nullable: true
 *                         expiresAt:
 *                           type: integer
 *                           nullable: true
 *                           description: Unix timestamp (seconds)
 *                         expiresIn:
 *                           type: integer
 *                           nullable: true
 *                           description: Seconds until access token expiry
 *                         tokenType:
 *                           type: string
 *                           enum: [bearer]
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: No profile or account deactivated
 */
export async function POST(request: Request) {
  return authController.signIn(request);
}
