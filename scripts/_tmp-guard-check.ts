import { loadEnvConfig } from "@next/env";
import postgres from "postgres";
import {
  parseNotesMetadata,
  supplierLinkForMaterialLot,
} from "../src/server/modules/purchase-lots/purchase-lot.service";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

async function main() {
  const rows = await sql`
    select pl.supplier_id, pl.project_id, pl.item_type, pl.notes,
           c.classification as consumable_classification,
           pl.reference
    from purchase_lots pl
    left join consumables c on c.id = pl.consumable_id
    where pl.supplier_id is not null
  `;

  let kept = 0;
  let droppedPo = 0;
  let droppedOpening = 0;
  for (const row of rows) {
    const meta = parseNotesMetadata(row.notes);
    const link = supplierLinkForMaterialLot({
      supplierId: row.supplier_id,
      classification: meta.draftItem?.classification ?? null,
      consumableClassification: row.consumable_classification,
      projectId: row.project_id,
    });
    if (link != null) {
      kept += 1;
      continue;
    }
    if (row.reference === "Initial stock") droppedOpening += 1;
    else droppedPo += 1;
  }

  console.log(
    JSON.stringify({
      withSupplier: rows.length,
      keptOnSupplierHistory: kept,
      hiddenFiledPos: droppedPo,
      hiddenOpeningStock: droppedOpening,
    })
  );
  await sql.end();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await sql.end();
  process.exit(1);
});
