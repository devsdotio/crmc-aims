import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getDb } from "../src/server/db/index";
import { profiles } from "../src/server/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  try {
    const db = getDb();
    const res = await db.select().from(profiles).where(eq(profiles.userId, "f66f8617-9a7c-4b94-8a24-d54b5014cbb9")).limit(1);
    console.log(res);
  } catch(e) {
    console.log(e);
  }
  process.exit(0);
}
main();
