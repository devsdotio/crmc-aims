import type { BrowseItem } from "./types";

/**
 * Physical availability used for stock status badges and the optional
 * "Available only" filter in the Browse catalog.
 */
export function isBrowseItemInStock(
  item: Pick<BrowseItem, "type" | "status">
): boolean {
  if (item.type === "asset") {
    return item.status === "active";
  }
  return item.status === "available" || item.status === "low_stock";
}

/**
 * Whether a catalog item can be added to a requester's request cart.
 * Supplies and materials remain requestable even when out of stock so Admin
 * can restock before approving/issuing; serialized assets still require
 * active warehouse availability.
 */
export function canRequestBrowseItem(
  item: Pick<BrowseItem, "type" | "status">
): boolean {
  if (item.type === "consumable") return true;
  return item.status === "active";
}

