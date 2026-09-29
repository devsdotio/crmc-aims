import { filterMoneyInput, filterUnsignedIntInput } from "@/lib/numeric-input";
import { stripPoPurposePrefix } from "@/lib/po-purpose";
import { groupByPurpose, purposePreviewLabel, summarizePurposes } from "@/lib/request-purpose";

/**
 * Shared helpers for voucher / petty-cash purpose + itemized particulars.
 * Particulars are stored as JSON:
 * [{ "description": "...", "quantity": "2", "unitCost": "50.00", "amount": "100.00", "purpose": "..." }, ...]
 * `amount` is the line total (quantity × unit cost). `purpose` is optional per line
 * (multi-purpose claims). Older rows may only have description and amount.
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
  /** Free-text justification for this line. Omitted on legacy single-purpose rows. */
  purpose?: string;
};

/** Client-only row id for purpose assignment. Not written to particulars JSON. */
export type DraftParticularLine = ParticularLineItem & { id: string };

export type PurposeGroupDraft = {
  id: string;
  purpose: string;
  lineIds: string[];
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
      const purpose = next.purpose?.trim() ?? "";
      return {
        description: next.description.trim(),
        quantity: normalizeQuantity(next.quantity),
        unitCost: normalizeAmount(next.unitCost),
        amount: normalizeAmount(next.amount),
        ...(purpose ? { purpose } : {}),
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
              const purpose = String(obj.purpose ?? "").trim();
              const base =
                quantity || unitCost
                  ? recomputeParticularLine({
                      description,
                      quantity,
                      unitCost,
                      amount,
                    })
                  : splitLegacyParticular(description, amount);
              return purpose ? { ...base, purpose } : base;
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
  if (field === "description" || field === "purpose") {
    return { ...item, [field]: raw };
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
    purpose?: string | null;
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
      const purpose = stripPoPurposePrefix(li.purpose);
      return {
        description: (li.itemName || "").trim(),
        quantity: qtyNum > 0 ? String(Math.trunc(qtyNum)) : "",
        unitCost: unit > 0 ? unit.toFixed(2) : "",
        amount: lineAmount,
        ...(purpose ? { purpose } : {}),
      };
    });

  return items.length > 0 ? items : [blankParticular()];
}

function newDraftId(): string {
  return crypto.randomUUID();
}

export function blankDraftParticular(): DraftParticularLine {
  return { id: newDraftId(), ...blankParticular() };
}

export function newPurposeGroupDraft(
  purpose = "",
  lineIds: string[] = []
): PurposeGroupDraft {
  return { id: newDraftId(), purpose, lineIds };
}

export function emptyPurposeDraft(): {
  lines: DraftParticularLine[];
  groups: PurposeGroupDraft[];
} {
  const line = blankDraftParticular();
  return {
    lines: [line],
    groups: [newPurposeGroupDraft("", [line.id])],
  };
}

/** Rebuild editable lines and purpose groups from stored particulars. */
export function draftFromStoredParticulars(
  items: ParticularLineItem[],
  headerPurpose = ""
): { lines: DraftParticularLine[]; groups: PurposeGroupDraft[] } {
  const source = items.length > 0 ? items : [blankParticular()];
  const lines: DraftParticularLine[] = source.map((item) => {
    const purpose = item.purpose?.trim() ?? "";
    return {
      id: newDraftId(),
      description: item.description,
      quantity: item.quantity,
      unitCost: item.unitCost,
      amount: item.amount,
      ...(purpose ? { purpose } : {}),
    };
  });

  const hasLinePurpose = lines.some((line) => Boolean(line.purpose?.trim()));
  if (!hasLinePurpose) {
    return {
      lines,
      groups: [
        newPurposeGroupDraft(
          headerPurpose.trim(),
          lines.map((line) => line.id)
        ),
      ],
    };
  }

  const sections = groupByPurpose(lines, headerPurpose.trim() || undefined);
  return {
    lines,
    groups: sections.map((section) =>
      newPurposeGroupDraft(
        section.purpose.trim().toLowerCase() === "general" ? "" : section.purpose,
        section.lines.map((line) => line.id)
      )
    ),
  };
}

/** Purpose groups for a catalog PO, with destination tags stripped. */
export function draftFromPurchaseOrderLines(
  lineItems: Array<{
    itemName?: string | null;
    quantity?: number | null;
    unitCost?: string | number | null;
    totalCost?: string | number | null;
    purpose?: string | null;
  }>
): { lines: DraftParticularLine[]; groups: PurposeGroupDraft[] } {
  return draftFromStoredParticulars(particularsFromPurchaseOrderLines(lineItems), "");
}

/** One group owns every line. Extra groups keep their assignments; orphans join the first group. */
export function seedPurposeGroupLines(
  groups: PurposeGroupDraft[],
  lineIds: string[]
): PurposeGroupDraft[] {
  if (groups.length <= 1) {
    const group = groups[0] ?? newPurposeGroupDraft("");
    return [{ ...group, lineIds }];
  }
  const idSet = new Set(lineIds);
  const pruned = groups.map((group) => ({
    ...group,
    lineIds: group.lineIds.filter((id) => idSet.has(id)),
  }));
  const assigned = new Set(pruned.flatMap((group) => group.lineIds));
  const orphans = lineIds.filter((id) => !assigned.has(id));
  if (orphans.length > 0) {
    return pruned.map((group, index) =>
      index === 0 ? { ...group, lineIds: [...group.lineIds, ...orphans] } : group
    );
  }
  return pruned;
}

export function attachLineToGroups(
  groups: PurposeGroupDraft[],
  lineId: string
): PurposeGroupDraft[] {
  if (groups.some((group) => group.lineIds.includes(lineId))) return groups;
  if (groups.length === 0) return [newPurposeGroupDraft("", [lineId])];
  return groups.map((group, index) =>
    index === 0 ? { ...group, lineIds: [...group.lineIds, lineId] } : group
  );
}

/** Drop a line. An emptied extra group is removed so it cannot fail validation. */
export function detachLineFromGroups(
  groups: PurposeGroupDraft[],
  lineId: string
): PurposeGroupDraft[] {
  const next = groups.map((group) => ({
    ...group,
    lineIds: group.lineIds.filter((id) => id !== lineId),
  }));
  if (next.length <= 1) return next;
  const kept = next.filter((group) => group.lineIds.length > 0);
  return kept.length > 0 ? kept : next;
}

export function assignLineToPurposeGroup(
  groups: PurposeGroupDraft[],
  groupId: string,
  lineId: string
): PurposeGroupDraft[] {
  return groups.map((group) => {
    if (group.id === groupId) {
      if (group.lineIds.includes(lineId)) return group;
      return { ...group, lineIds: [...group.lineIds, lineId] };
    }
    return { ...group, lineIds: group.lineIds.filter((id) => id !== lineId) };
  });
}

export function removePurposeGroupDraft(
  groups: PurposeGroupDraft[],
  groupId: string
): PurposeGroupDraft[] {
  if (groups.length <= 1) return groups;
  const removing = groups.find((group) => group.id === groupId);
  const kept = groups.filter((group) => group.id !== groupId);
  if (!removing || kept.length === 0) return groups;
  if (removing.lineIds.length === 0) return kept;
  return kept.map((group, index) =>
    index === 0
      ? { ...group, lineIds: [...group.lineIds, ...removing.lineIds] }
      : group
  );
}

export function applyPurposeGroups(
  lines: DraftParticularLine[],
  groups: PurposeGroupDraft[]
): ParticularLineItem[] {
  const purposeById = new Map<string, string>();
  for (const group of groups) {
    const purpose = group.purpose.trim();
    for (const id of group.lineIds) purposeById.set(id, purpose);
  }
  return lines.map((line) => {
    const purpose = purposeById.get(line.id) ?? "";
    return {
      description: line.description,
      quantity: line.quantity,
      unitCost: line.unitCost,
      amount: line.amount,
      ...(purpose ? { purpose } : {}),
    };
  });
}

/** Header column value. Empty when every group is blank — not the "General" fallback. */
export function headerPurposeFromGroups(
  groups: Array<{ purpose: string }>
): string {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    const purpose = group.purpose.trim();
    if (!purpose) continue;
    const key = purpose.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(purpose);
  }
  if (unique.length === 0) return "";
  return summarizePurposes(unique);
}

/** Multi-purpose groups require text and at least one line. A single group stays optional. */
export function purposeGroupsError(groups: PurposeGroupDraft[]): string | null {
  if (groups.length <= 1) return null;
  for (let i = 0; i < groups.length; i++) {
    if (!groups[i].purpose.trim()) return `Purpose ${i + 1} is required.`;
    if (groups[i].lineIds.length === 0) {
      return `Purpose ${i + 1} needs at least one line item.`;
    }
  }
  return null;
}

export function commitPurposeDraft(
  lines: DraftParticularLine[],
  groups: PurposeGroupDraft[]
): { purpose: string; particulars: string; error: string | null } {
  const seeded = seedPurposeGroupLines(
    groups,
    lines.map((line) => line.id)
  );
  return {
    purpose: headerPurposeFromGroups(seeded),
    particulars: serializeParticulars(applyPurposeGroups(lines, seeded)),
    error: purposeGroupsError(seeded),
  };
}

export function particularPurposeSections(
  items: ParticularLineItem[],
  headerPurpose?: string | null
): { sections: Array<{ purpose: string; lines: ParticularLineItem[] }>; isMulti: boolean } {
  const sections = groupByPurpose(
    items.map((item) => ({
      ...item,
      purpose: item.purpose?.trim() || undefined,
    })),
    headerPurpose
  );
  const keys = new Set(
    sections
      .map((section) => section.purpose.trim().toLowerCase())
      .filter((purpose) => purpose && purpose !== "general")
  );
  return { sections, isMulti: keys.size > 1 };
}

/** List chip: "N purposes" when line justifications differ; otherwise the header text. */
export function disbursementPurposeLabel(
  purpose: string | null | undefined,
  particulars: string | null | undefined
): { label: string; title: string } {
  const items = parseParticulars(particulars);
  const linePurposes = items
    .map((item) => item.purpose?.trim() ?? "")
    .filter(Boolean);
  const title =
    (purpose ?? "").trim() ||
    linePurposes.filter((value, index, all) => all.indexOf(value) === index).join("; ");
  const unique = new Set(linePurposes.map((value) => value.toLowerCase()));
  const label =
    unique.size > 1
      ? purposePreviewLabel(purpose, linePurposes)
      : formatPurposeParticularsPreview(purpose, particulars);
  return { label, title: title || label };
}
