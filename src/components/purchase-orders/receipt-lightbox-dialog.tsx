"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Printer,
  Maximize2,
  FileText,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReceiptLightboxDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  poNumber?: string;
}

export function ReceiptLightboxDialog({
  isOpen,
  onClose,
  imageUrl,
  title = "Purchase Receipt",
  poNumber,
}: ReceiptLightboxDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(3, z + 0.25));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(0.5, z - 0.25));
      } else if (e.key === "0") {
        setZoom(1);
        setRotation(0);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${poNumber ? `Receipt - ${poNumber}` : "Purchase Receipt"}</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
            @media print {
              body { margin: 0; }
              img { max-width: 100%; height: auto; }
            }
          </style>
        </head>
        <body>
          <img src="${imageUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = imageUrl.split(".").pop()?.split("?")[0] || "jpg";
      a.download = `${poNumber ? `Receipt-${poNumber}` : "Purchase-Receipt"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  const isPdf = imageUrl.toLowerCase().includes(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex flex-col w-full max-w-5xl h-[90vh] bg-bg rounded-2xl shadow-2xl overflow-hidden border border-border/80 z-10"
      >
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/90 backdrop-blur-xs select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shrink-0 shadow-2xs">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-text truncate">
                {title}
              </h3>
              {poNumber && (
                <p className="text-xs font-mono text-text-secondary truncate">
                  PO: {poNumber}
                </p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {!isPdf && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out (-)"
                  className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                  title="Reset Zoom (0)"
                  className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  title="Zoom In (+)"
                  className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div className="w-px h-5 bg-border mx-1" />
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate 90°"
                  className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handlePrint}
              title="Print Receipt"
              className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleDownload}
              title="Download File"
              className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
            </button>

            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              title="Open Raw Image in New Tab"
              className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            <div className="w-px h-5 bg-border mx-1" />

            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="p-2 rounded-lg text-text-secondary hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="relative flex-1 overflow-auto bg-black/5 dark:bg-black/30 flex items-center justify-center p-4">
          {isPdf ? (
            <iframe
              src={imageUrl}
              title={title}
              className="w-full h-full rounded-lg border border-border bg-white"
            />
          ) : (
            <div
              className="transition-transform duration-150 ease-out flex items-center justify-center min-w-full min-h-full"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg border border-border/50 bg-card select-none"
              />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-card/60 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Digital Receipt Archive · Attached to Purchase Order</span>
          </div>
          <span className="text-[11px] font-mono">
            CRMC AIMS Secure Storage
          </span>
        </div>
      </div>
    </div>
  );
}
