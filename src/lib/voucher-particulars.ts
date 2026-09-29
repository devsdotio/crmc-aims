import { filterMoneyInput, filterUnsignedIntInput } from "@/lib/numeric-input";

/**
 * Shared helpers for voucher / petty-cash purpose + itemized particulars.
 * Particulars are stored as JSON:
 * [{ "description": "...", "quantity": "2", "unitCost": "50.00", "amount": "100.00" }, ...]
 * `amount` is the line total (quantity × unit cost). Older rows may only have description and amount.
 * Legacy plain-text / numbered-list values are still parsed for display.
 */

export type ParticularLineItem = {
  description: string;
  /** Whole units. Empty when the line has no quantity yet. */
  quantity: string;
  /** Unit cost. Empty when the line total was stored without a unit price. */
  unitCost: string;
  /** Line total. Computed from quantity × unit cost when both are set. */
  amount: string;
};

export function blankParticular(): ParticularLineItem {
  return { description: "", quantity: "1", unitCost: "", amount: "" };
}

const MONEY_TRAILING =
  /\s*(?:@|\(|\||-)?\s*(?:₱|PHP\s*)?([\d,]+(?:\.\d{1,2})?)\s*\)?\s*$/i;

export function serializeParticulars(items: ParticularLineItem[]): string {
  const cleaned = items
    .map((item) => {
      const next = recomputeParticularLine(item);
      return {
        description: next.description.trim(),
        quantity: normalizeQuantity(next.quantity),
        unitCost: normalizeAmount(next.unitCost),
        amount: normalizeAmount(next.amount),
      };
    })
    .filter((item) => item.description.length > 0);

  if (cleaned.length === 0) return "";
  return JSON.stringify(cleaned);
}

export function parseParticulars(
  raw: string | null | undefined
): ParticularLineItem[] {
  if (!raw?.trim()) return [];

  const trimmed = raw.trim();

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        const items = parsed
          .map((entry): ParticularLineItem | null => {
            if (typeof entry === "string") {
              return splitLegacyParticular(entry.trim(), "");
            }
            if (entry && typeof entry === "object") {
              const obj = entry as Record<string, unknown>;
              const description = String(
                obj.description ?? obj.name ?? obj.item ?? ""
              ).trim();
              if (!description) return null;
              const amount = normalizeAmount(String(obj.amount ?? obj.cost ?? ""));
              const quantity = normalizeQuantity(String(obj.quantity ?? ""));
              const unitCost = normalizeAmount(String(obj.unitCost ?? obj.unit_cost ?? ""));
              if (quantity || unitCost) {
                return recomputeParticularLine({
                  description,
                  quantity,
                  unitCost,
                  amount,
                });
              }
              return splitLegacyParticular(description, amount);
            }
            return null;
          })
          .filter((item): item is ParticularLineItem => item !== null);

        if (items.length > 0) return items;
      }
    } catch {
      // fall through to legacy text parsing
    }
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const withoutBullet = line
        .replace(/^(\s*[-*•]|\s*\d+[\.\)])\s*/, "")
        .trim();
      const moneyMatch = withoutBullet.match(MONEY_TRAILING);
      if (moneyMatch) {
        const amount = normalizeAmount(moneyMatch[1].replace(/,/g, ""));
        const description = withoutBullet
          .slice(0, moneyMatch.index)
          .trim()
          .replace(/[\s@(|-]+$/, "")
          .trim();
        return splitLegacyParticular(description || withoutBullet, amount);
      }
      return splitLegacyParticular(withoutBullet, "");
    });
}

/** Line total. Uses quantity × unit cost when a unit cost is entered. */
export function particularLineAmount(item: ParticularLineItem): number {
  const unitRaw = item.unitCost.trim().replace(/,/g, "");
  if (unitRaw) {
    const qty = Number(item.quantity.trim().replace(/,/g, ""));
    const unit = Number(unitRaw);
    if (Number.isFinite(qty) && qty >= 0 && Number.isFinite(unit) && unit >= 0) {
      return qty * unit;
    }
  }
  const amount = Number(item.amount.trim().replace(/,/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

export function sumParticularAmounts(items: ParticularLineItem[]): number {
  return items.reduce((sum, item) => sum + particularLineAmount(item), 0);
}

/**
 * Apply a particulars field edit. Returns null when the keystroke is not a
 * valid quantity or money value, so the caller can keep the previous row.
 */
export function patchParticularLine(
  item: ParticularLineItem,
  field: keyof ParticularLineItem,
  raw: string
): ParticularLineItem | null {
  if (field === "description") {
    return { ...item, description: raw };
  }
  if (field === "quantity") {
    const quantity = filterUnsignedIntInput(raw);
    if (quantity === null) return null;
    return recomputeParticularLine({ ...item, quantity });
  }
  if (field === "unitCost") {
    const unitCost = filterMoneyInput(raw);
    if (unitCost === null) return null;
    return recomputeParticularLine({ ...item, unitCost });
  }
  const amount = filterMoneyInput(raw);
  if (amount === null) return null;
  return { ...item, amount };
}

/** Short preview for tables / lists. Prefers purpose, then first line descriptions. */
export function formatPurposeParticularsPreview(
  purpose: string | null | undefined,
  particulars: string | null | undefined,
  maxLen = 80
): string {
  const purposeText = (purpose ?? "").trim();
  if (purposeText) {
    return purposeText.length > maxLen
      ? `${purposeText.slice(0, maxLen - 1)}…`
      : purposeText;
  }

  const items = parseParticulars(particulars);
  if (items.length === 0) return "";

  const joined = items.map((i) => i.description).join("; ");
  return joined.length > maxLen ? `${joined.slice(0, maxLen - 1)}…` : joined;
}

function normalizeQuantity(value: string): string {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return "";
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return "";
  return String(Math.trunc(n));
}

function recomputeParticularLine(item: ParticularLineItem): ParticularLineItem {
  if (!item.unitCost.trim()) return item;
  const qty = Number(item.quantity.trim() || "0");
  const unit = Number(item.unitCost.trim().replace(/,/g, ""));
  if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(unit) || unit < 0) {
    return item;
  }
  return { ...item, amount: (qty * unit).toFixed(2) };
}

/** Pull a leading "2x " quantity out of older descriptions. */
function splitLegacyParticular(
  description: string,
  amount: string
): ParticularLineItem {
  const match = description.match(/^(\d+)\s*x\s+/i);
  if (!match) {
    return { description, quantity: "", unitCost: "", amount };
  }
  const quantity = match[1];
  const rest = description.slice(match[0].length).trim();
  const qty = Number(quantity);
  const line = Number(amount);
  const unitCost =
    qty > 0 && Number.isFinite(line) && line > 0 ? (line / qty).toFixed(2) : "";
  return {
    description: rest || description,
    quantity,
    unitCost,
    amount,
  };
}

function normalizeAmount(value: string): string {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return "";
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return "";
  return n.toFixed(2);
}

/** Extract department label from PO purpose format: `[Dept Name] remaining purpose…` */
export function extractDepartmentNameFromPoPurpose(
  purpose: string | null | undefined
): string | null {
  if (!purpose?.trim()) return null;
  const match = purpose.match(/^\[(.*?)\]/);
  const name = match?.[1]?.trim();
  return name || null;
}

export type PoDepartmentSource = {
  departmentId?: string | null;
  departmentName?: string | null;
  purpose?: string | null;
  recordedByUserId?: string | null;
  departments?: Array<{ id: string; name: string }>;
};

export function formatDepartmentList(
  departments?: Array<{ name: string }> | null,
  fallback?: string | null
): string {
  const names = (departments ?? [])
    .map((d) => d.name.trim())
    .filter(Boolean);
  if (names.length > 0) return names.join(", ");
  return fallback?.trim() || "";
}

/** All departments on a linked PO (join list, else primary department). */
export function resolveDepartmentsFromPo(
  sources: PoDepartmentSource | PoDepartmentSource[],
  catalog: Array<{ id: string; name: string; code?: string | null }>,
  users?: Array<{
    id: string;
    departmentId?: string | null;
    department?: string | null;
  }>
): Array<{ id: string; name: string }> {
  const list = Array.isArray(sources) ? sources : [sources];
  const seen = new Map<string, string>();

  for (const source of list) {
    if (source.departments?.length) {
      for (const d of source.departments) {
        if (d.id && d.name) seen.set(d.id, d.name);
      }
    }
  }

  if (seen.size > 0) {
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }

  const primaryId = resolveDepartmentIdFromPo(list, catalog, users);
  if (!primaryId) return [];
  const match = catalog.find((d) => d.id === primaryId);
  return match ? [{ id: match.id, name: match.name }] : [];
}

/**
 * Resolve a department id from a linked PO:
 * 1) explicit departmentId on the lot (primary for multi-dept project POs)
 * 2) departmentName / [Dept] purpose matched to catalog
 * 3) recorded-by user's departmentId (legacy fallback)
 *
 * Resolves the primary charging department (first on a multi-dept PO).
 * Use `resolveDepartmentsFromPo` when the voucher / petty-cash row should
 * inherit every sponsoring department.
 */
export function resolveDepartmentIdFromPo(
  sources: PoDepartmentSource | PoDepartmentSource[],
  departments: Array<{ id: string; name: string; code?: string | null }>,
  users?: Array<{
    id: string;
    departmentId?: string | null;
    department?: string | null;
  }>
): string | null {
  const list = Array.isArray(sources) ? sources : [sources];

  for (const source of list) {
    if (source.departmentId) {
      const exists = departments.some((d) => d.id === source.departmentId);
      if (exists) return source.departmentId;
    }
  }

  const labels: string[] = [];
  for (const source of list) {
    if (source.departmentName?.trim()) labels.push(source.departmentName.trim());
    const fromPurpose = extractDepartmentNameFromPoPurpose(source.purpose);
    if (fromPurpose) labels.push(fromPurpose);
  }

  for (const label of labels) {
    const needle = label.toLowerCase();
    const match = departments.find(
      (d) =>
        d.name.trim().toLowerCase() === needle ||
        (d.code && d.code.trim().toLowerCase() === needle)
    );
    if (match) return match.id;
  }

  if (users?.length) {
    for (const source of list) {
      if (!source.recordedByUserId) continue;
      const user = users.find((u) => u.id === source.recordedByUserId);
      if (user?.departmentId) {
        const exists = departments.some((d) => d.id === user.departmentId);
        if (exists) return user.departmentId;
      }
      if (user?.department?.trim()) {
        const needle = user.department.trim().toLowerCase();
        const match = departments.find(
          (d) =>
            d.name.trim().toLowerCase() === needle ||
            (d.code && d.code.trim().toLowerCase() === needle)
        );
        if (match) return match.id;
      }
    }
  }

  return null;
}

/** Build voucher/petty-cash particulars from PO line items. */
export function particularsFromPurchaseOrderLines(
  lineItems: Array<{
    itemName?: string | null;
    quantity?: number | null;
    unitCost?: string | number | null;
    totalCost?: string | number | null;
  }>
): ParticularLineItem[] {
  const items = lineItems
    .filter((li) => Boolean(li?.itemName?.trim()))
    .map((li) => {
      const qtyNum = Number(li.quantity) || 0;
      const tCost = parseFloat(String(li.totalCost || "0"));
      const uCost = parseFloat(String(li.unitCost || "0"));
      const unit =
        uCost > 0 ? uCost : qtyNum > 0 && tCost > 0 ? tCost / qtyNum : 0;
      const lineAmount =
        qtyNum > 0 && unit > 0
          ? (qtyNum * unit).toFixed(2)
          : tCost > 0
            ? tCost.toFixed(2)
            : "";
      return {
        description: (li.itemName || "").trim(),
        quantity: qtyNum > 0 ? String(Math.trunc(qtyNum)) : "",
        unitCost: unit > 0 ? unit.toFixed(2) : "",
        amount: lineAmount,
      };
    });

  return items.length > 0 ? items : [blankParticular()];
}
