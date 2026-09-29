"use client";

import { useMemo } from "react";
import { Receipt, UploadCloud } from "lucide-react";
import { POReceiptUploader } from "@/components/purchase-orders/po-receipt-uploader";
import { useToast } from "@/components/providers/toast-context";
import { useAssetOperator } from "@/hooks/use-asset-operator";
import {
  usePurchaseLotsQuery,
  useUpdatePurchaseOrderMutation,
} from "@/features/purchase-lots/client";

interface DisbursementReceiptSlotProps {
  purchaseOrderNumber: string | null | undefined;
  claimStatus: string;
  enabled?: boolean;
}

export function DisbursementReceiptSlot({
  purchaseOrderNumber,
  claimStatus,
  enabled = true,
}: DisbursementReceiptSlotProps) {
  const toast = useToast();
  const { canOperate } = useAssetOperator();
  const updatePOMutation = useUpdatePurchaseOrderMutation();
  const poNumber = purchaseOrderNumber?.trim() || "";
  const { data: purchaseLots = [] } = usePurchaseLotsQuery({
    enabled: enabled && Boolean(poNumber),
  });

  const lot = useMemo(() => {
    if (!poNumber) return null;
    const cleanPo = poNumber.toLowerCase();
    return (
      purchaseLots.find(
        (item) =>
          (item.poNumber && item.poNumber.trim().toLowerCase() === cleanPo) ||
          item.lotCode.trim().toLowerCase() === cleanPo
      ) ?? null
    );
  }, [poNumber, purchaseLots]);

  const receiptUnlocked =
    claimStatus === "disbursed" || claimStatus === "completed";
  const lockReason = receiptUnlocked
    ? undefined
    : "Receipt upload opens after this disbursement is marked disbursed.";

  return (
    <div className="rounded-2xl border border-border bg-bg-subtle/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
          Vendor receipt
        </div>
        {lot?.receiptUrl ? (
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
            Attached
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-orange-800 dark:text-orange-300 bg-orange-500/15 px-2 py-0.5 rounded-full border border-orange-500/25">
            No file yet
          </span>
        )}
      </div>

      {!poNumber ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-bg/60 px-4 py-8 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg-subtle text-text-secondary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold text-text">No receipt placeholder yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-text-secondary">
            Link a purchase order on this disbursement. The vendor receipt is uploaded on that order.
          </p>
        </div>
      ) : !lot ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-bg/60 px-4 py-8 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg-subtle text-text-secondary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold text-text">Purchase order not on file</p>
          <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-text-secondary">
            No purchase order matches <span className="font-mono text-text">{poNumber}</span>, so there is nowhere to drop the receipt.
          </p>
        </div>
      ) : (
        <POReceiptUploader
          compact
          receiptUrl={lot.receiptUrl}
          poNumber={lot.poNumber || lot.lotCode}
          lotId={lot.id}
          canOperate={canOperate}
          disabled={!receiptUnlocked}
          disabledReason={lockReason}
          onUploadSuccess={async (url) => {
            await updatePOMutation.mutateAsync({
              id: lot.id,
              payload: { receiptUrl: url },
            });
            toast.success("Receipt saved on the purchase order.");
          }}
          onRemove={async () => {
            try {
              await updatePOMutation.mutateAsync({
                id: lot.id,
                payload: { receiptUrl: null },
              });
              toast.success("Receipt removed from the purchase order.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to remove receipt.");
            }
          }}
        />
      )}
    </div>
  );
}
