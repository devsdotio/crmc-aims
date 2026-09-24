import { getDb } from "@/server/db";
import { purchaseLots } from "@/server/db/schema/purchase-lots";
import { requireActor } from "@/server/shared/auth";
import { handleError, ok } from "@/server/shared/http";
import { desc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    
    // Fetch recent purchase lots
    const lots = await getDb()
      .select()
      .from(purchaseLots)
      .where(eq(purchaseLots.tenantId, actor.tenantId))
      .orderBy(desc(purchaseLots.createdAt))
      .limit(1000);
    
    type FlattenedLog = {
      id: string;
      requestCode: string;
      department: string;
      action: string;
      actor: string;
      timestamp: string;
      note?: string;
    };
    
    const logs: FlattenedLog[] = lots.map((lot) => ({
      id: lot.id,
      requestCode: lot.lotCode,
      department: lot.supplierName || "Internal",
      action: "purchased",
      actor: lot.recordedByName,
      timestamp: lot.createdAt.toISOString(),
      note: `Received ${lot.quantity}x ${lot.itemName} @ ${lot.unitCost}`,
    }));
    
    return ok(logs);
  } catch (error) {
    return handleError(error);
  }
}
