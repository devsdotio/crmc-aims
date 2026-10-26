"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft, FileText } from "lucide-react";

import {
  CustomPrintableReport,
  type PaperSize,
} from "@/components/custom-reports/print/CustomPrintableReport";
import {
  clearCustomPrintPayload,
  loadCustomPrintPayload,
  type CustomPrintPayload,
} from "@/lib/custom-reports/print-payload";

async function waitForPrintAssets(root: HTMLElement | null): Promise<void> {
  if (!root) return;
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        })
    )
  );
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
}

function CustomReportPrintPageInner() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";
  const paramPaperSize = (searchParams.get("paperSize") as PaperSize) || "long";
  const paramOrientation = (searchParams.get("orientation") as "portrait" | "landscape") || "portrait";
  const paramMargin = (searchParams.get("margin") as "narrow" | "normal") || "narrow";

  const rootRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CustomPrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [paperSize, setPaperSize] = useState<PaperSize>(paramPaperSize);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(paramOrientation);
  const [margin, setMargin] = useState<"narrow" | "normal">(paramMargin);
  const printedRef = useRef(false);

  useEffect(() => {
    try {
      const payload = loadCustomPrintPayload(key);
      if (!payload) {
        setError(
          "No print payload found. Go back to the report, click Print / PDF, and try again."
        );
        return;
      }
      setData(payload);
      // Auto-select landscape if more than 6 columns to prevent cramped tables
      if ((payload.columns?.length ?? 0) > 6 && !searchParams.get("orientation")) {
        setOrientation("landscape");
      }
    } catch {
      setError("Failed to load print payload.");
    }
  }, [key, searchParams]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    void (async () => {
      await waitForPrintAssets(rootRef.current);
      if (cancelled) return;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    if (!ready || !data || printedRef.current) return;
    printedRef.current = true;
    const t = window.setTimeout(() => {
      window.print();
      window.setTimeout(() => clearCustomPrintPayload(key), 60_000);
    }, 350);
    return () => window.clearTimeout(t);
  }, [ready, data, key]);

  if (error) {
    return (
      <div className="p-8 max-w-md mx-auto my-12 text-center rounded-2xl border border-border bg-card shadow-lg space-y-4">
        <p className="text-sm text-text-secondary">{error}</p>
        <Link
          href="/custom-reports"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="size-3.5" />
          Back to Custom Reports
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-text">
        <div className="relative flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <p className="text-sm font-bold text-text">Assembling Print Preview…</p>
        <p className="text-xs text-text-secondary">
          Compiling report records, layout, and tenant branding.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-bg-subtle print:bg-white">
      {/* Top Interactive Toolbar (Hidden during browser print) */}
      <div className="no-print print:hidden sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border bg-bg/95 backdrop-blur-xs shadow-xs min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text flex items-center gap-2 truncate">
            <FileText className="size-4 text-primary shrink-0" />
            <span className="truncate">{data.templateName || "Custom Report"} — Formal Print Preview</span>
          </p>
          <p className="text-xs text-text-secondary truncate">
            {ready
              ? "Ready. Use the orientation toggle to optimize column width, or click Print."
              : "Assembling document assets…"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Sheet Format Selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-text-secondary text-[11px] hidden md:inline">Sheet:</span>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSize)}
              className="h-8 px-2.5 rounded-lg border border-border bg-bg-subtle text-xs font-semibold text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="long">Long Bond (8.5&quot; × 13&quot;)</option>
              <option value="legal">US Legal (8.5&quot; × 14&quot;)</option>
              <option value="a4">ISO A4 (8.3&quot; × 11.7&quot;)</option>
              <option value="letter">US Letter (8.5&quot; × 11&quot;)</option>
            </select>
          </div>

          {/* Margin Selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-text-secondary text-[11px] hidden md:inline">Margin:</span>
            <select
              value={margin}
              onChange={(e) => setMargin(e.target.value as "narrow" | "normal")}
              className="h-8 px-2 rounded-lg border border-border bg-bg-subtle text-xs font-semibold text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="narrow">Narrow (8mm)</option>
              <option value="normal">Normal (15mm)</option>
            </select>
          </div>

          {/* Orientation Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setOrientation("portrait")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                orientation === "portrait"
                  ? "bg-bg text-text shadow-2xs font-semibold"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => setOrientation("landscape")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                orientation === "landscape"
                  ? "bg-bg text-text shadow-2xs font-semibold"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              Landscape
            </button>
          </div>

          <Link
            href="/custom-reports"
            className="h-8.5 px-3 rounded-lg border border-border bg-bg text-xs font-medium text-text hover:bg-bg-subtle inline-flex items-center transition-colors"
          >
            Close
          </Link>
          <button
            type="button"
            disabled={!ready}
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60 shadow-xs hover:opacity-90 transition-opacity"
          >
            <Printer className="size-3.5" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Render Document */}
      <div ref={rootRef} className="py-6 px-4 print:p-0 overflow-x-auto">
        <div className="min-w-fit w-max mx-auto">
          <CustomPrintableReport
            data={data}
            orientation={orientation}
            paperSize={paperSize}
            margin={margin}
          />
        </div>
      </div>
    </div>
  );
}

export default function CustomReportPrintPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-text-secondary">Preparing print preview…</p>
      }
    >
      <CustomReportPrintPageInner />
    </Suspense>
  );
}
