import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: db
 *         schema:
 *           type: string
 *           enum: ["1", "true"]
 *         description: When set, also probes Postgres via Hyperdrive / DATABASE_URL
 *     responses:
 *       200:
 *         description: API is available
 *       503:
 *         description: Database probe failed
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const probeDb =
    url.searchParams.get("db") === "1" || url.searchParams.get("db") === "true";

  if (!probeDb) {
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { getDb } = await import("@/server/db");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    await db.execute(sql`select 1`);

    return NextResponse.json({
      status: "ok",
      db: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database probe failed";
    console.error("Health DB probe failed:", message);
    return NextResponse.json(
      {
        status: "degraded",
        db: "error",
        error: message.slice(0, 240),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
