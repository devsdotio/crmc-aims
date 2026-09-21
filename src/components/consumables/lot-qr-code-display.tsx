"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface LotQrCodeDisplayProps {
  lotCode: string;
  /** Human label under the code (item name + supplier). */
  label: string;
  /** Override raw payload; defaults to `CRMC-AIMS-LOT:{lotCode}`. */
  qrPayload?: string;
  size?: number;
  className?: string;
}

function defaultLotQr(lotCode: string) {
  return `CRMC-AIMS-LOT:${lotCode.trim()}`;
}

/**
 * Printable QR tag for a consumable purchase lot (supplier batch + frozen unit cost).
 * Not for per-unit tags — those belong on coded assets.
 */
export function LotQrCodeDisplay({
  lotCode,
  label,
  qrPayload,
  size = 140,
  className,
}: LotQrCodeDisplayProps) {
  const [downloaded, setDownloaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const payload = qrPayload?.trim() || defaultLotQr(lotCode);

  const handleDownload = () => {
    try {
      const svg = containerRef.current?.querySelector("svg");
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      canvas.width = size + 40;
      canvas.height = size + 90;

      img.onload = () => {
        if (!ctx) return;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20, size, size);

        ctx.fillStyle = "#1B2140";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(lotCode, canvas.width / 2, size + 42);

        ctx.fillStyle = "#5A5F73";
        ctx.font = "10px sans-serif";
        ctx.fillText("CRMC-AIMS Lot Tag", canvas.width / 2, size + 60);

        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `QR-LOT-${lotCode}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2000);
      };

      img.src =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error("Failed to export lot QR PNG:", err);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-bg text-center space-y-2 shadow-xs",
        className
      )}
    >
      <div className="p-2 bg-white rounded-lg border border-border">
        <QRCodeSVG value={payload} size={size} level="H" includeMargin={false} />
      </div>
      <div className="space-y-0.5 w-full">
        <span className="font-mono text-xs font-bold text-text tracking-wide block bg-bg-subtle px-2 py-1 rounded border border-border truncate">
          {lotCode}
        </span>
        <p
          className="text-[10px] text-text-secondary truncate px-1"
          title={label}
        >
          {label}
        </p>
        <p className="text-[9px] font-mono text-text-secondary/80 break-all px-1">
          {payload}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer",
          downloaded
            ? "bg-status-active-bg text-white"
            : "bg-primary text-primary-foreground hover:bg-accent"
        )}
      >
        {downloaded ? (
          <>
            <Check className="h-3 w-3" />
            Downloaded
          </>
        ) : (
          <>
            <Download className="h-3 w-3" />
            Download Lot Label
          </>
        )}
      </button>
    </div>
  );
}
