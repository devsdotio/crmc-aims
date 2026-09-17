/**
 * Shared helpers for voucher / petty-cash purpose + itemized particulars.
 * Particulars are stored as JSON: [{ "description": "...", "amount": "123.45" }, ...]
 * Legacy plain-text / numbered-list values are still parsed for display.
 */

export type ParticularLineItem = {
  description: string;
  /** Empty string when no line cost; otherwise a numeric string (e.g. "150.00") */
  amount: string;
};

const MONEY_TRAILING =
  /\s*(?:@|\(|\||-)?\s*(?:₱|PHP\s*)?([\d,]+(?:\.\d{1,2})?)\s*\)?\s*$/i;

export function serializeParticulars(items: ParticularLineItem[]): string {
  const cleaned = items
    .map((item) => ({
      description: item.description.trim(),
      amount: normalizeAmount(item.amount),
    }))
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
              return { description: entry.trim(), amount: "" };
            }
            if (entry && typeof entry === "object") {
              const obj = entry as Record<string, unknown>;
              const description = String(
                obj.description ?? obj.name ?? obj.item ?? ""
              ).trim();
              if (!description) return null;
              return {
                description,
                amount: normalizeAmount(String(obj.amount ?? obj.cost ?? "")),
              };
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
        return {
          description: description || withoutBullet,
          amount,
        };
      }
      return { description: withoutBullet, amount: "" };
    });
}

export function sumParticularAmounts(items: ParticularLineItem[]): number {
  return items.reduce((sum, item) => {
    const n = Number(item.amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
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
};

/**
 * Resolve a department id from a linked PO:
 * 1) explicit departmentId on the lot
 * 2) departmentName / [Dept] purpose matched to catalog
 * 3) recorded-by user's departmentId (legacy fallback)
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
      const qty = li.quantity ? `${li.quantity}x ` : "";
      const tCost = parseFloat(String(li.totalCost || "0"));
      const uCost = parseFloat(String(li.unitCost || "0"));
      const lineAmount =
        tCost > 0
          ? tCost.toFixed(2)
          : uCost > 0 && li.quantity
            ? (uCost * Number(li.quantity)).toFixed(2)
            : uCost > 0
              ? uCost.toFixed(2)
              : "";
      return {
        description: `${qty}${li.itemName}`.trim(),
        amount: lineAmount,
      };
    });

  return items.length > 0 ? items : [{ description: "", amount: "" }];
}
