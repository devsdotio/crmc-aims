import { projectController } from "@/server/modules/projects";

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List projects (admin/superadmin)
 *     tags: [Projects]
 *   post:
 *     summary: Create a project
 *     tags: [Projects]
 */
export async function GET(request: Request) {
  return projectController.list(request);
}

export async function POST(request: Request) {
  return projectController.create(request);
}
