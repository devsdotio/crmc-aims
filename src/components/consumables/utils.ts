/**
 * Utility functions for the Consumables feature.
 * Separated from types.ts to keep type files as pure declarations.
 */

import type { StockSeverity } from "@/types/inventory";

export function availableQty(item: {
  currentQty: number;
  reservedQty?: number | null;
}): number {
  return Math.max(0, item.currentQty - (item.reservedQty ?? 0));
}

/**
 * Named helper utility calculating stock severity.
 * - Critical: currentQty <= minThreshold
 * - Low: minThreshold < currentQty <= minThreshold * 1.2
 * - Healthy: currentQty > minThreshold * 1.2
 */
export function getStockSeverity(currentQty: number, minThreshold: number): StockSeverity {
  if (currentQty <= minThreshold) {
    return "critical";
  }
  if (currentQty <= minThreshold * 1.2) {
    return "low";
  }
  return "healthy";
}
