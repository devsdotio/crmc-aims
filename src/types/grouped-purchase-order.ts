import type { PurchaseLot } from "@/types/purchase-lots";

export interface GroupedPurchaseOrder {
  /** The first lot in the group — used as representative for PO-level metadata */
  representative: PurchaseLot;
  /** All lots belonging to this PO */
  lineItems: PurchaseLot[];
  /** Aggregated total cost across all line items */
  totalCost: number;
  /** Aggregated total quantity across all line items */
  totalQuantity: number;
  /** Number of distinct line items in this PO */
  itemCount: number;
  /** Unique PO number used as group key */
  poNumber: string;
}

/**
 * Groups a flat array of PurchaseLot records by their PO number.
 * Multi-item POs (sharing the same poNumber) are collapsed into a single group.
 */
export function groupLotsByPO(lots: PurchaseLot[]): GroupedPurchaseOrder[] {
  const map = new Map<string, PurchaseLot[]>();

  for (const lot of lots) {
    const key = lot.poNumber || lot.lotCode;
    const existing = map.get(key);
    if (existing) {
      existing.push(lot);
    } else {
      map.set(key, [lot]);
    }
  }

  const groups: GroupedPurchaseOrder[] = [];

  for (const [poNumber, lineItems] of map) {
    const representative = lineItems[0];
    let totalCost = 0;
    let totalQuantity = 0;

    for (const item of lineItems) {
      totalCost += parseFloat(item.totalCost) || 0;
      totalQuantity += item.quantity;
    }

    // Attach all line items to representative and all lots in the group
    // so downstream components (detail sheet, print slip) can access them reliably
    if (lineItems.length > 1) {
      const mappedItems = lineItems.map((li) => ({
        id: li.id,
        itemType: li.itemType,
        consumableId: li.consumableId,
        assetId: li.assetId,
        itemCode: li.itemCode,
        itemName: li.itemName,
        quantity: li.quantity,
        unitCost: li.unitCost,
        totalCost: li.totalCost,
        purpose: li.purpose,
        suggestedDealer: li.supplierName,
        lotCode: li.lotCode,
      }));
      representative.items = mappedItems;
      for (const li of lineItems) {
        li.items = mappedItems;
      }
    }

    groups.push({
      representative,
      lineItems,
      totalCost,
      totalQuantity,
      itemCount: lineItems.length,
      poNumber,
    });
  }

  return groups;
}
