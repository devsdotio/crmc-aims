import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../src/server/db/index";
import { sql } from "drizzle-orm";
async function main() {
  try {
    await db.client.execute(sql`ALTER TABLE "borrow_requests" ADD COLUMN "picked_up_by" text;`);
    console.log("added column");
  } catch(e) {
    console.log(e);
  }
  process.exit(0);
}
main();
