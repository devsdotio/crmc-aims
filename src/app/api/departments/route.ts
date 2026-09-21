import { departmentController } from "@/server/modules/departments";

/**
 * @swagger
 * /api/departments:
 *   get:
 *     summary: List departments
 *     tags: [Departments]
 *   post:
 *     summary: Create a department
 *     tags: [Departments]
 */
export async function GET(request: Request) {
  return departmentController.list(request);
}

export async function POST(request: Request) {
  return departmentController.create(request);
}
