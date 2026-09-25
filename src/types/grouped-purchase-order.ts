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
 * Detects whether a purchase lot represents an opening inventory / initial stock
 * adjustment on item creation rather than a formal Purchase Order.
 */
export function isInitialStockLot(lot: PurchaseLot): boolean {
  const ref = (lot.reference || "").trim().toLowerCase();
  const po = (lot.poNumber || "").trim().toLowerCase();
  const notes = (lot.notes || "").trim().toLowerCase();
  const purpose = (lot.purpose || "").trim().toLowerCase();

  return (
    ref === "initial stock" ||
    ref.startsWith("initial stock") ||
    ref === "opening balance" ||
    ref.startsWith("opening balance") ||
    po === "initial stock" ||
    po === "opening balance" ||
    po === "po-initial stock" ||
    po.startsWith("initial stock") ||
    po.startsWith("opening balance") ||
    notes.includes("opening balance on item create") ||
    purpose.includes("initial stock") ||
    purpose.includes("opening balance")
  );
}

/**
 * Groups a flat array of PurchaseLot records by their PO number.
 * Multi-item POs (sharing the same poNumber) are collapsed into a single group.
 * By default, excludes opening balance / initial stock lots which do not represent real purchase orders.
 */
export function groupLotsByPO(
  lots: PurchaseLot[],
  options?: { excludeInitialStock?: boolean }
): GroupedPurchaseOrder[] {
  const { excludeInitialStock = true } = options ?? {};
  const validLots = excludeInitialStock
    ? lots.filter((lot) => !isInitialStockLot(lot))
    : lots;

  const map = new Map<string, PurchaseLot[]>();

  for (const lot of validLots) {
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
    // Prefer the least-advanced non-cancelled line as representative so partial
    // multi-item receives still show actionable workflow status in the list.
    const STATUS_RANK: Record<string, number> = {
      pending_approval: 0,
      approved: 1,
      ordered: 2,
      delivered: 3,
      cancelled: 99,
    };
    const activeLines = lineItems.filter((li) => li.status !== "cancelled");
    const representative =
      (activeLines.length > 0
        ? activeLines.reduce((least, li) =>
            (STATUS_RANK[li.status] ?? 99) < (STATUS_RANK[least.status] ?? 99)
              ? li
              : least
          )
        : lineItems[0]) ?? lineItems[0];
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

    // Sync receiptUrl across representative and all line items in group
    const groupReceiptUrl = lineItems.find((li) => li.receiptUrl)?.receiptUrl ?? null;
    if (groupReceiptUrl) {
      representative.receiptUrl = groupReceiptUrl;
      for (const li of lineItems) {
        li.receiptUrl = groupReceiptUrl;
      }
    }

    // Union sponsoring / requesting departments (multi-dept POs)
    const deptMap = new Map<string, string>();
    for (const li of lineItems) {
      if (li.departments?.length) {
        for (const d of li.departments) {
          if (d.id) deptMap.set(d.id, d.name);
        }
      } else if (li.departmentId && li.departmentName) {
        deptMap.set(li.departmentId, li.departmentName);
      }
    }
    if (deptMap.size > 0) {
      const departments = [...deptMap.entries()].map(([id, name]) => ({
        id,
        name,
      }));
      representative.departments = departments;
      for (const li of lineItems) {
        li.departments = departments;
      }
    }

    const cancelReason = lineItems.find((li) => li.cancellationReason)?.cancellationReason;
    if (cancelReason) {
      representative.cancellationReason = cancelReason;
      for (const li of lineItems) {
        if (!li.cancellationReason) li.cancellationReason = cancelReason;
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
