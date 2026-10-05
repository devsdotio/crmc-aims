/**
 * Project expense lines: inventory stock vs manual (off-inventory) materials.
 *
 * Inventory charges use lineType "consumable". Older PO→project deliveries
 * incorrectly stored lineType "material" while still setting consumableId and
 * deducting stock — treat those as inventory for display / delete routing.
 */

export type ExpenseLineKindInput = {
  lineType: string;
  consumableId?: string | null;
};

/** Charged from warehouse stock (deducts / can reverse inventory). */
export function isInventoryExpenseLine(line: ExpenseLineKindInput): boolean {
  if (line.lineType === "consumable") return true;
  return line.lineType === "material" && Boolean(line.consumableId);
}

/** Off-inventory material entry (no stock movement). */
export function isManualMaterialExpenseLine(
  line: ExpenseLineKindInput
): boolean {
  return line.lineType === "material" && !line.consumableId;
}
