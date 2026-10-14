import {
  defaultCustomReportLayout,
  type CustomReportColumnDef,
  type CustomReportFilters,
  type CustomReportLayoutBlock,
  type CustomReportRunResult,
} from "@/types/custom-reports";

export interface CustomPrintPayload {
  templateName?: string;
  organizationName?: string;
  organizationSubtitle?: string;
  logoUrl?: string;
  columns: CustomReportColumnDef[];
  rows: Record<string, string | number | boolean | null>[];
  filters: CustomReportFilters;
  layout: CustomReportLayoutBlock[];
  total?: number;
}

export const CUSTOM_REPORT_PRINT_STORAGE_PREFIX = "custom-report-print:";
export const CUSTOM_REPORT_PRINT_TTL_MS = 30 * 60 * 1000;

type StoredEnvelope = {
  createdAt: number;
  payload: CustomPrintPayload;
};

export type PrintStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function buildCustomPrintPayload(
  run: CustomReportRunResult,
  templateName?: string | null
): CustomPrintPayload {
  const layout =
    run.layout?.length > 0
      ? run.layout
      : defaultCustomReportLayout(templateName || "Custom report");

  return {
    templateName: templateName || undefined,
    organizationName: run.organizationName,
    organizationSubtitle: run.organizationSubtitle,
    logoUrl: run.logoUrl,
    columns: run.columns ?? [],
    rows: run.rows ?? [],
    filters: (run.filters ?? {}) as CustomReportFilters,
    layout,
    total: run.total,
  };
}

/** Ensure layout always has a table block when columns/rows exist. */
export function ensurePrintableLayout(
  layout: CustomReportLayoutBlock[] | undefined,
  reportTitle: string
): CustomReportLayoutBlock[] {
  const blocks = layout?.length ? [...layout] : defaultCustomReportLayout(reportTitle);
  if (!blocks.some((b) => b.type === "table")) {
    blocks.push({ id: "table_auto", type: "table", props: {} });
  }
  return blocks;
}

export function isValidCustomPrintPayload(value: unknown): value is CustomPrintPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.columns) || !Array.isArray(v.rows)) return false;
  if (!Array.isArray(v.layout)) return false;
  if (v.filters != null && typeof v.filters !== "object") return false;
  return true;
}

function defaultStorage(): PrintStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function storeCustomPrintPayload(
  payload: CustomPrintPayload,
  storage: PrintStorage | undefined = defaultStorage(),
  now = Date.now()
): string {
  if (!storage) {
    throw new Error("Local storage is unavailable for print payload.");
  }
  const key = `${CUSTOM_REPORT_PRINT_STORAGE_PREFIX}${now.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const envelope: StoredEnvelope = { createdAt: now, payload };
  storage.setItem(key, JSON.stringify(envelope));
  return key;
}

export function loadCustomPrintPayload(
  key: string,
  storage: PrintStorage | undefined = defaultStorage(),
  now = Date.now()
): CustomPrintPayload | null {
  if (!key || !key.startsWith(CUSTOM_REPORT_PRINT_STORAGE_PREFIX) || !storage) {
    return null;
  }
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredEnvelope | CustomPrintPayload;
    // Support both envelope and raw payload shapes
    if (isValidCustomPrintPayload(parsed)) {
      return {
        ...parsed,
        layout: ensurePrintableLayout(
          parsed.layout,
          parsed.templateName || "Custom report"
        ),
      };
    }
    const envelope = parsed as StoredEnvelope;
    if (
      !envelope ||
      typeof envelope.createdAt !== "number" ||
      !isValidCustomPrintPayload(envelope.payload)
    ) {
      storage.removeItem(key);
      return null;
    }
    if (now - envelope.createdAt > CUSTOM_REPORT_PRINT_TTL_MS) {
      storage.removeItem(key);
      return null;
    }
    return {
      ...envelope.payload,
      layout: ensurePrintableLayout(
        envelope.payload.layout,
        envelope.payload.templateName || "Custom report"
      ),
    };
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function clearCustomPrintPayload(
  key: string,
  storage: PrintStorage | undefined = defaultStorage()
): void {
  if (!key || !storage) return;
  storage.removeItem(key);
}

export function buildCustomReportPrintUrl(storageKey: string): string {
  const params = new URLSearchParams({ key: storageKey });
  return `/custom-reports/print?${params.toString()}`;
}
