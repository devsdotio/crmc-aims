"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QRCodeDisplayProps {
  assetCode: string;
  assetName: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({
  assetCode,
  assetName,
  size = 180,
  className,
}: QRCodeDisplayProps) {
  const [downloaded, setDownloaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    try {
      const svg = containerRef.current?.querySelector("svg");
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      canvas.width = size + 40;
      canvas.height = size + 80;

      img.onload = () => {
        if (!ctx) return;
        // White background label padding
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR
        ctx.drawImage(img, 20, 20, size, size);

        // Text label
        ctx.fillStyle = "#1B2140";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(assetCode, canvas.width / 2, size + 45);

        ctx.fillStyle = "#5A5F73";
        ctx.font = "10px sans-serif";
        ctx.fillText("CRMC-AIMS Asset Tag", canvas.width / 2, size + 65);

        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `QR-${assetCode}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2000);
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error("Failed to export QR PNG:", err);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-bg text-center space-y-3 shadow-xs",
        className
      )}
    >
      {/* SVG QR Code */}
      <div className="p-3 bg-white rounded-lg border border-border shadow-2xs">
        <QRCodeSVG
          value={`CRMC-AIMS:${assetCode}`}
          size={size}
          level="H"
          includeMargin={false}
        />
      </div>

      {/* Human readable code fallback */}
      <div className="space-y-0.5">
        <span className="font-mono text-sm font-bold text-text tracking-wider block bg-bg-subtle px-3 py-1 rounded border border-border">
          {assetCode}
        </span>
        <p className="text-[11px] text-text-secondary truncate max-w-50" title={assetName}>
          {assetName}
        </p>
      </div>

      {/* Download Label Button */}
      <button
        type="button"
        onClick={handleDownload}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer",
          downloaded
            ? "bg-status-active-bg text-white"
            : "bg-primary text-primary-foreground hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        )}
      >
        {downloaded ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Downloaded!
          </>
        ) : (
          <>
            <Download className="h-3.5 w-3.5" />
            Download Label (PNG)
          </>
        )}
      </button>
    </div>
  );
}
