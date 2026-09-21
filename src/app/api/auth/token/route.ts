import { authController } from "@/server/modules/auth";

/**
 * @swagger
 * /api/auth/token:
 *   post:
 *     summary: OAuth2 password token (Swagger Authorize)
 *     description: |
 *       Resource-owner password grant for tooling (primarily Swagger UI).
 *
 *       In Swagger, open **Authorize**, choose **bearerAuth (OAuth2)**,
 *       enter your email as username and your password, then Authorize.
 *       Subsequent "Try it out" calls send `Authorization: Bearer <token>`.
 *
 *       Prefer `POST /api/auth/sign-in` for application clients that want
 *       the full profile envelope.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               grant_type:
 *                 type: string
 *                 example: password
 *               username:
 *                 type: string
 *                 format: email
 *                 description: Account email
 *               password:
 *                 type: string
 *                 format: password
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               grant_type:
 *                 type: string
 *                 example: password
 *               username:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: OAuth2 access token response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [access_token, token_type]
 *               properties:
 *                 access_token:
 *                   type: string
 *                 token_type:
 *                   type: string
 *                   enum: [bearer]
 *                 expires_in:
 *                   type: integer
 *                 refresh_token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: No profile or account deactivated
 */
export async function POST(request: Request) {
  return authController.token(request);
}
