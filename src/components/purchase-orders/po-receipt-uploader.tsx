"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadPOReceiptMutation } from "@/features/purchase-lots/client";
import { useToast } from "@/components/providers/toast-context";
import { ReceiptLightboxDialog } from "./receipt-lightbox-dialog";

interface POReceiptUploaderProps {
  receiptUrl?: string | null;
  poNumber?: string;
  lotId?: string;
  canOperate?: boolean;
  onUploadSuccess?: (url: string) => void;
  onRemove?: () => void;
  compact?: boolean;
  className?: string;
}

export function POReceiptUploader({
  receiptUrl,
  poNumber,
  lotId,
  canOperate = false,
  onUploadSuccess,
  onRemove,
  compact = false,
  className,
}: POReceiptUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const toast = useToast();
  const uploadMutation = useUploadPOReceiptMutation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    await processUpload(file);
    // Reset input so same file can be re-selected if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processUpload = async (file: File) => {
    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB size limit.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      toast.error("Please upload an image (JPG, PNG, WEBP) or PDF receipt.");
      return;
    }

    try {
      const res = await uploadMutation.mutateAsync({
        file,
        poNumber,
        lotId,
      });

      toast.success("Receipt picture uploaded successfully.");
      onUploadSuccess?.(res.url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload receipt image."
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canOperate) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!canOperate) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processUpload(files[0]);
    }
  };

  const isPdf = receiptUrl?.toLowerCase().includes(".pdf");

  return (
    <div className={cn("space-y-3", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={!canOperate || uploadMutation.isPending}
      />

      {receiptUrl ? (
        /* Attached Receipt Card */
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 transition-all shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text truncate">
                    Official Receipt / Proof of Purchase
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Attached
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary truncate">
                  {poNumber ? `Linked to Order ${poNumber}` : "Archived in Supabase Storage"}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                title="Full Preview"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-bg border border-border text-text hover:bg-bg-subtle hover:border-accent/40 transition-colors cursor-pointer shadow-2xs"
              >
                <Maximize2 className="h-3.5 w-3.5 text-accent" />
                <span className="hidden sm:inline">Inspect</span>
              </button>

              {canOperate && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    title="Replace Receipt"
                    className="p-1.5 rounded-lg border border-border bg-bg text-text-secondary hover:text-accent hover:border-accent/40 hover:bg-accent/10 transition-colors cursor-pointer"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {onRemove && (
                    <button
                      type="button"
                      onClick={onRemove}
                      disabled={uploadMutation.isPending}
                      title="Remove Receipt"
                      className="p-1.5 rounded-lg border border-rose-500/30 bg-bg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Interactive Preview Canvas */}
          <div
            onClick={() => setIsLightboxOpen(true)}
            className="group relative rounded-lg border border-border/70 bg-bg overflow-hidden cursor-pointer flex items-center justify-center min-h-[160px] max-h-[260px] hover:border-accent/50 transition-all shadow-inner"
          >
            {isPdf ? (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                <FileText className="h-12 w-12 text-accent/80" />
                <span className="text-xs font-medium text-text">
                  PDF Document Receipt
                </span>
                <span className="text-[11px] text-text-secondary">
                  Click to open full document viewer
                </span>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={receiptUrl}
                alt="Receipt Proof"
                className="w-full h-full object-contain max-h-[260px] group-hover:scale-[1.02] transition-transform duration-200"
              />
            )}

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-medium text-xs">
              <Maximize2 className="h-4 w-4" />
              <span>Click to view full screen & print</span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (canOperate && !uploadMutation.isPending) {
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            "relative rounded-xl border-2 border-dashed transition-all p-6 text-center flex flex-col items-center justify-center gap-3",
            canOperate ? "cursor-pointer" : "cursor-not-allowed opacity-80",
            isDragging
              ? "border-accent bg-accent/10 scale-[1.01]"
              : "border-border hover:border-accent/60 hover:bg-bg-subtle/50 bg-card/60",
            compact && "p-4 gap-2"
          )}
        >
          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center gap-2 py-4 text-accent">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-xs font-semibold text-text">
                Uploading receipt picture...
              </p>
              <p className="text-[11px] text-text-secondary">
                Saving to secure CRMC-AIMS cloud archive
              </p>
            </div>
          ) : (
            <>
              <div className="h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-xs group-hover:scale-105 transition-transform">
                <UploadCloud className="h-6 w-6" />
              </div>

              <div className="space-y-1 max-w-sm">
                <p className="text-xs font-bold text-text">
                  {canOperate
                    ? "Upload Receipt or Sales Invoice Picture"
                    : "No Receipt Attached"}
                </p>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  {canOperate
                    ? "Drag and drop a photo or scan of the official vendor receipt here, or click to browse."
                    : "An authorized operator can attach receipt pictures for this order."}
                </p>
              </div>

              {canOperate && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-mono uppercase font-semibold text-text-secondary bg-bg-subtle px-2 py-1 rounded-md border border-border/80">
                    JPG, PNG, WEBP, PDF
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    Max 10 MB
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Lightbox Dialog */}
      {receiptUrl && (
        <ReceiptLightboxDialog
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          imageUrl={receiptUrl}
          title="Purchase Order Receipt"
          poNumber={poNumber}
        />
      )}
    </div>
  );
}
