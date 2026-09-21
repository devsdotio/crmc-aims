import { userController } from "@/server/modules/users";

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List application user profiles
 *     tags: [Users]
 *   post:
 *     summary: Create a staff/borrower (or admin if superadmin) with a set password
 *     tags: [Users]
 *     description: No public signup — admin sets the initial password via service role createUser.
 */
export async function GET(request: Request) {
  return userController.listUsers(request);
}

export async function POST(request: Request) {
  return userController.createUser(request);
}
