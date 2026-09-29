"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, Loader2, Printer, X } from "lucide-react";
import type { Voucher } from "@/types/vouchers";
import type { PettyCashVoucher } from "@/types/petty-cash";
import { useToast } from "@/components/providers/toast-context";
import { useUpdateVoucherMutation } from "@/features/vouchers/client/use-vouchers";
import { useUpdatePettyCashMutation } from "@/features/petty-cash/client/use-petty-cash";
import {
  buildDisbursementSlipFullHtml,
  disbursementSlipFilename,
  downloadDisbursementSlipPdf,
  pettyCashToSlip,
  voucherToSlip,
  type DisbursementSlipData,
} from "@/components/disbursements/disbursement-official-slip";

type SlipTarget =
  | { kind: "voucher"; record: Voucher }
  | { kind: "petty_cash"; record: PettyCashVoucher };

interface DisbursementPrintSlipDialogProps {
  target: SlipTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (record: Voucher | PettyCashVoucher) => void;
}

export function DisbursementPrintSlipDialog({
  target,
  isOpen,
  onClose,
  onUpdated,
}: DisbursementPrintSlipDialogProps) {
  const toast = useToast();
  const updateVoucher = useUpdateVoucherMutation();
  const updatePettyCash = useUpdatePettyCashMutation();
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const targetRef = useRef(target);
  const onUpdatedRef = useRef(onUpdated);
  const recordId = target?.record.id ?? "";

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    onUpdatedRef.current = onUpdated;
  }, [onUpdated]);

  const slip = useMemo<DisbursementSlipData | null>(() => {
    if (!isOpen || !target || typeof window === "undefined") return null;
    const logoUrl = `${window.location.origin}/CRMC%20LOGO.png`;
    return target.kind === "voucher"
      ? voucherToSlip(target.record, logoUrl)
      : pettyCashToSlip(target.record, logoUrl);
    // Keep the preview still while a name is typed and saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, recordId]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onClose();
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    function handleMessage(event: MessageEvent) {
      const data = event.data as { source?: string; field?: string; value?: string } | null;
      if (!data || data.source !== "crmc-disbursement-slip") return;
      const current = targetRef.current;
      if (!current) return;
      if (data.field !== "requestedBy" && data.field !== "verifiedBy") return;

      const value = String(data.value ?? "").replace(/\s+/g, " ").trim();
      const saved =
        data.field === "requestedBy"
          ? current.record.payeeName.trim()
          : (current.record.approvedByName ?? "").trim();
      if (value === saved) return;
      if (data.field === "requestedBy" && !value) {
        toast.error("Requested by needs a name.");
        return;
      }

      const payload =
        data.field === "requestedBy"
          ? { payeeName: value }
          : { approvedByName: value || null };
      const onSuccess = (record: Voucher | PettyCashVoucher) => {
        onUpdatedRef.current?.(record);
      };
      const onError = (err: Error) => {
        toast.error(err.message || "Failed to save the signature name.");
      };

      if (current.kind === "voucher") {
        updateVoucher.mutate({ id: current.record.id, payload }, { onSuccess, onError });
      } else {
        updatePettyCash.mutate({ id: current.record.id, payload }, { onSuccess, onError });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen, toast, updateVoucher, updatePettyCash]);

  if (!isOpen || !slip) return null;

  const previewHtml = buildDisbursementSlipFullHtml(slip);

  const slipForOutput = (): DisbursementSlipData => {
    const doc = iframeRef.current?.contentDocument;
    const requested = doc?.querySelector<HTMLInputElement>(
      '[data-slip-field="requestedBy"]'
    );
    const verified = doc?.querySelector<HTMLInputElement>(
      '[data-slip-field="verifiedBy"]'
    );
    const prepared = doc?.querySelector<HTMLInputElement>(
      '[data-slip-field="preparedBy"]'
    );
    if (!requested && !verified && !prepared) return slip;
    return {
      ...slip,
      requestedBy: requested ? requested.value.trim() : slip.requestedBy,
      verifiedBy: verified ? verified.value.trim() : slip.verifiedBy,
      preparedBy: prepared ? prepared.value.trim() : slip.preparedBy,
    };
  };

  const handlePrint = () => {
    const output = slipForOutput();
    const outputHtml = buildDisbursementSlipFullHtml(output);
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

    doc.open();
    doc.write(outputHtml);
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
      setTimeout(triggerPrint, 200);
    }
  };

  const handleSavePdf = async () => {
    if (isSavingPdf) return;
    setIsSavingPdf(true);
    try {
      const output = slipForOutput();
      await downloadDisbursementSlipPdf(output, disbursementSlipFilename(output));
      toast.success("Disbursement slip saved as PDF.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save disbursement slip as PDF."
      );
    } finally {
      setIsSavingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="disbursement-slip-title"
        className="relative w-full max-w-4xl max-h-[92vh] rounded-2xl border border-border bg-bg shadow-2xl z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-accent shrink-0" />
            <h2 id="disbursement-slip-title" className="text-sm font-bold text-text truncate">
              {slip.documentTitle} · {slip.code}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-border/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 bg-white p-1.5 sm:p-2">
          <iframe
            ref={iframeRef}
            title={`${slip.documentTitle} preview`}
            srcDoc={previewHtml}
            className="block h-135 sm:h-145 max-h-[calc(92vh-7.5rem)] w-full border-0 bg-white"
          />
        </div>

        <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-text-secondary font-medium">
            {updateVoucher.isPending || updatePettyCash.isPending
              ? "Saving signature names…"
              : "Edit Requested by, Verified by, or Prepared by on the slip."}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-bg hover:bg-bg-subtle text-text transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={isSavingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-emerald-600/30 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{isSavingPdf ? "Saving PDF…" : "Save as PDF"}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-accent transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
