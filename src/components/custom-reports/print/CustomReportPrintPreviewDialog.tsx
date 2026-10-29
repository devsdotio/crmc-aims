"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  ArrowLeftRight,
  Maximize2,
  Minimize2,
} from "lucide-react";

import {
  CustomPrintableReport,
  type PaperSize,
} from "@/components/custom-reports/print/CustomPrintableReport";
import type { CustomPrintPayload } from "@/lib/custom-reports/print-payload";

interface CustomReportPrintPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payload: CustomPrintPayload | null;
  templateName?: string;
}

export function CustomReportPrintPreviewDialog({
  isOpen,
  onClose,
  payload,
  templateName,
}: CustomReportPrintPreviewDialogProps) {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [paperSize, setPaperSize] = useState<PaperSize>("long");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fitWidth, setFitWidth] = useState(true);
  const [margin, setMargin] = useState<"narrow" | "normal">("narrow");
  const printContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (payload) {
      // Auto-set landscape if columns count exceeds 6
      if ((payload.columns?.length ?? 0) > 6) {
        setOrientation("landscape");
      } else {
        setOrientation("portrait");
      }
      // Ensure Long Bond Paper is selected by default
      setPaperSize("long");
      setMargin("narrow");
    }
  }, [payload]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !payload) return null;

  const isLandscape = orientation === "landscape";

  const handlePrint = () => {
    const content = printContentRef.current;
    if (!content) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Collect all stylesheets from head so Tailwind and styles are fully preserved
    const styleTags = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((el) => el.outerHTML)
      .join("\n");

    const pageSizeRule =
      paperSize === "long"
        ? isLandscape
          ? "13in 8.5in"
          : "8.5in 13in"
        : paperSize === "legal"
        ? isLandscape
          ? "14in 8.5in"
          : "8.5in 14in"
        : paperSize === "letter"
        ? isLandscape
          ? "11in 8.5in"
          : "8.5in 11in"
        : `A4 ${orientation}`;

    const pageMarginRule = margin === "narrow" ? "8mm 10mm" : "14mm 16mm";
    const printPaddingRule = margin === "narrow" ? "8mm 10mm" : "14mm 16mm";

    const reportHtml = content.innerHTML;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${templateName || payload.templateName || "Custom Report"}</title>
  ${styleTags}
  <style>
    @page {
      size: ${pageSizeRule};
      margin: ${pageMarginRule};
    }
    html, body {
      background: #ffffff !important;
      color: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .no-print,
    .print\\:hidden {
      display: none !important;
    }
    .custom-print-root {
      padding: ${printPaddingRule} !important;
      margin: 0 auto !important;
      width: 100% !important;
      max-width: none !important;
      min-height: auto !important;
      box-shadow: none !important;
      border: none !important;
      box-sizing: border-box !important;
    }
    .custom-print-root table {
      width: 100% !important;
      table-layout: auto !important;
    }
    .custom-print-root tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .signatories-block {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-top: 1.25rem !important;
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 1.5rem !important;
    }
    .signatories-block > div {
      text-align: center !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }
    .signatories-block .signature-line {
      width: 13rem !important;
      max-width: 80% !important;
      margin-left: auto !important;
      margin-right: auto !important;
      border-bottom: 1px solid #9ca3af !important;
    }
    .signatories-block .signatory-name {
      text-transform: uppercase !important;
      font-weight: 700 !important;
    }
    .page-break {
      break-before: page;
      page-break-before: always;
    }
  </style>
</head>
<body>
  ${reportHtml}
</body>
</html>`);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    };

    const logoImg = doc.querySelector("img");
    if (logoImg && !logoImg.complete) {
      logoImg.onload = triggerPrint;
      logoImg.onerror = triggerPrint;
    } else {
      setTimeout(triggerPrint, 250);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs transition-opacity">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-dialog-title"
        className={`relative flex flex-col bg-bg border border-border rounded-xl shadow-2xl z-10 transition-all overflow-hidden ${
          isFullscreen
            ? "w-[98vw] h-[96vh]"
            : "w-[96vw] sm:w-full max-w-7xl max-h-[94vh] h-[92vh] sm:h-[min(880px,94vh)]"
        }`}
      >
        {/* Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border bg-card shrink-0 min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <FileSpreadsheet className="size-4 sm:size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="print-dialog-title"
                className="text-xs sm:text-sm font-bold text-text leading-tight flex items-center gap-2 flex-wrap min-w-0"
              >
                <span className="truncate max-w-45 sm:max-w-xs md:max-w-md">
                  {templateName || payload.templateName || "Custom Report"}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0 whitespace-nowrap">
                  Long Bond Paper (8.5&quot; × 13&quot;)
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-text-secondary mt-0.5 truncate">
                Print &amp; PDF Document Preview · {payload.total ?? payload.rows?.length ?? 0} rows assembled
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
            {/* Paper Size Selector */}
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

            {/* Orientation Switcher */}
            <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setOrientation("portrait")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  !isLandscape
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
                  isLandscape
                    ? "bg-bg text-text shadow-2xs font-semibold"
                    : "text-text-secondary hover:text-text"
                }`}
              >
                Landscape
              </button>
            </div>

            {/* Fit Width vs 1:1 Scale Toggle */}
            <button
              type="button"
              onClick={() => setFitWidth(!fitWidth)}
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                fitWidth
                  ? "bg-bg text-primary border-primary/40 shadow-2xs"
                  : "bg-bg-subtle text-text-secondary border-border hover:text-text"
              }`}
              title={fitWidth ? "Switch to 1:1 Actual Paper Scale" : "Fit Sheet to Dialog Width"}
            >
              <ArrowLeftRight className="size-3.5" />
              <span>{fitWidth ? "Fit Width" : "1:1 Scale"}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg border border-border bg-bg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors hidden sm:inline-flex"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
            >
              {isFullscreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>

            {/* Print Primary Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity"
            >
              <Printer className="size-3.5" />
              Print / PDF
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close print preview"
              className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors ml-1"
            >
              <X className="size-4.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Canvas with Simulated Paper Sheet */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-neutral-200/70 dark:bg-neutral-950/80 p-3 sm:p-5 md:p-6 flex justify-center items-start">
          <div className={`py-2 pb-16 flex justify-center items-start transition-all duration-200 ${
            fitWidth ? "w-full max-w-full" : "min-w-fit w-max mx-auto"
          }`}>
            <div
              ref={printContentRef}
              className={`bg-white shadow-2xl border border-neutral-300 min-h-fit ${
                fitWidth ? "w-full max-w-full" : ""
              }`}
            >
              <CustomPrintableReport
                data={payload}
                orientation={orientation}
                paperSize={paperSize}
                fitWidth={fitWidth}
                margin={margin}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
