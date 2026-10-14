"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";

import { CustomPrintableReport } from "@/components/custom-reports/print/CustomPrintableReport";
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CustomPrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
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
    } catch {
      setError("Failed to load print payload.");
    }
  }, [key]);

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
    }, 250);
    return () => window.clearTimeout(t);
  }, [ready, data, key]);

  if (error) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-text-secondary">{error}</p>
        <a href="/custom-reports" className="text-sm underline text-text">
          Back to Custom Reports
        </a>
      </div>
    );
  }

  if (!data) {
    return <p className="p-6 text-sm text-text-secondary">Preparing print view…</p>;
  }

  return (
    <div className="min-h-full bg-bg-subtle print:bg-white">
      <div className="no-print print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-bg">
        <div>
          <p className="text-sm font-semibold text-text">
            {data.templateName || "Custom report"} — print preview
          </p>
          <p className="text-xs text-text-secondary">
            {ready
              ? "Use your browser dialog to Save as PDF, or click Print again."
              : "Loading assets…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/custom-reports"
            className="h-9 px-3 rounded-md border border-border text-sm text-text hover:bg-bg-subtle inline-flex items-center"
          >
            Close
          </a>
          <button
            type="button"
            disabled={!ready}
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            <Printer className="size-4" />
            Print / PDF
          </button>
        </div>
      </div>

      <div ref={rootRef} className="py-4 print:py-0">
        <CustomPrintableReport data={data} />
      </div>
    </div>
  );
}

export default function CustomReportPrintPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-text-secondary">Preparing print view…</p>
      }
    >
      <CustomReportPrintPageInner />
    </Suspense>
  );
}
