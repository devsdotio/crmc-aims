"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FilePlus2,
  Receipt,
  Building2,
  Boxes,
  Calendar,
  CreditCard,
  FileText,
  Search,
  Check,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowRight,
  RotateCcw,
  Banknote,
  Lock,
  AlignLeft,
  ListOrdered,
  Plus,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-context";
import { useCreateVoucherMutation } from "@/features/vouchers/client";
import { usePurchaseLotsQuery } from "@/features/purchase-lots/client/use-purchase-lots";
import { useSuppliersQuery } from "@/features/suppliers/client/use-suppliers";
import { groupLotsByPO, type GroupedPurchaseOrder } from "@/types/grouped-purchase-order";
import { formatPhp } from "@/components/projects/format-money";
import type { VoucherType } from "@/types/vouchers";
import { cn } from "@/lib/utils";

interface CreateVoucherDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateVoucherDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateVoucherDialogProps) {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const prefix = `DDR${currentYear}-`;

  // Form states
  const [codeSuffix, setCodeSuffix] = useState("");
  const type: VoucherType = "disbursement";
  const [voucherDate, setVoucherDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [payeeName, setPayeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [particulars, setParticulars] = useState("");
  const [particularsMode, setParticularsMode] = useState<"paragraph" | "list">("paragraph");
  const [listItems, setListItems] = useState<string[]>([""]);
  const [checkNumber, setCheckNumber] = useState("");
  const [isLegacy, setIsLegacy] = useState(false);

  // PO Search state for the second column
  const [poSearch, setPoSearch] = useState("");

  // Queries
  const { data: lots = [] } = usePurchaseLotsQuery({ enabled: isOpen });
  const { data: suppliers = [] } = useSuppliersQuery({ enabled: isOpen, activeOnly: true });

  const groupedPOs = useMemo(() => {
    return groupLotsByPO(lots);
  }, [lots]);

  // Filtered PO list based on user search in the second column
  const filteredPOs = useMemo(() => {
    if (!poSearch.trim()) return groupedPOs;
    const q = poSearch.toLowerCase().trim();
    return groupedPOs.filter((po) => {
      const poNum = (po.poNumber || "").toLowerCase();
      const supp = (po.representative.supplierName || "").toLowerCase();
      const item = (po.representative.itemName || "").toLowerCase();
      return poNum.includes(q) || supp.includes(q) || item.includes(q);
    });
  }, [groupedPOs, poSearch]);

  const createMutation = useCreateVoucherMutation();

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setCodeSuffix("");
      setVoucherDate(new Date().toISOString().slice(0, 10));
      setPayeeName("");
      setAmount("");
      setSupplierId(null);
      setSupplierName("");
      setPurchaseOrderNumber("");
      setParticulars("");
      setParticularsMode("paragraph");
      setListItems([""]);
      setCheckNumber("");
      setIsLegacy(false);
      setPoSearch("");
    }
  }, [isOpen]);

  // Handle PO selection and auto-fill line items into particulars
  const handleSelectPO = (po: GroupedPurchaseOrder) => {
    if (isLegacy) return;
    setPurchaseOrderNumber(po.poNumber);
    const suppName = po.representative.supplierName || "";
    setSupplierName(suppName);
    setPayeeName(suppName);
    setSupplierId(po.representative.supplierId || null);
    setAmount(po.totalCost ? String(po.totalCost) : "0");

    // Extract and format all line items from the selected PO
    const rawItems =
      po.lineItems && po.lineItems.length > 0
        ? po.lineItems
        : po.representative
        ? [po.representative]
        : [];

    const formattedList = rawItems
      .filter((li) => Boolean(li && li.itemName))
      .map((li) => {
        const qty = li.quantity ? `${li.quantity}x ` : "";
        const uCost = parseFloat(li.unitCost || "0");
        const tCost = parseFloat(li.totalCost || "0");
        const priceInfo =
          uCost > 0
            ? ` @ ${formatPhp(uCost)}`
            : tCost > 0
            ? ` (${formatPhp(tCost)})`
            : "";
        return `${qty}${li.itemName}${priceInfo}`;
      });

    const items =
      formattedList.length > 0
        ? formattedList
        : [`Disbursement for Purchase Order #${po.poNumber}`];

    // Auto-fill particulars in both list mode and paragraph text
    setListItems(items);
    setParticulars(items.map((it, idx) => `${idx + 1}. ${it}`).join("\n"));
    setParticularsMode("list");
  };

  const handleClearPO = () => {
    setPurchaseOrderNumber("");
    setPayeeName("");
    setAmount("");
    setParticulars("");
    setListItems([""]);
    setSupplierId(null);
    setSupplierName("");
  };

  // Switch between paragraph and list format
  const handleSwitchMode = (mode: "paragraph" | "list") => {
    if (mode === particularsMode) return;
    if (mode === "list") {
      const lines = particulars
        .split("\n")
        .map((l) => l.replace(/^(\s*[-*•]|\s*\d+[\.\)])\s*/, "").trim())
        .filter(Boolean);
      setListItems(lines.length > 0 ? lines : [""]);
    } else {
      const validItems = listItems.map((it) => it.trim()).filter(Boolean);
      if (validItems.length > 0) {
        setParticulars(validItems.map((it, idx) => `${idx + 1}. ${it}`).join("\n"));
      }
    }
    setParticularsMode(mode);
  };

  // List item actions
  const handleItemChange = (index: number, val: string) => {
    setListItems((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleAddItem = () => {
    setListItems((prev) => [...prev, ""]);
  };

  const handleRemoveItem = (index: number) => {
    setListItems((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedSuffix = codeSuffix.trim();
    if (!trimmedSuffix) {
      toast.error("Voucher Number is required. Please enter the numeric suffix (e.g. 000428).");
      return;
    }

    if (!payeeName.trim()) {
      toast.error("Payee / Disbursed To is required. Please enter who the funds are given to.");
      return;
    }

    if (!amount || parseFloat(amount) < 0) {
      toast.error("Amount is required and must be 0.00 or greater.");
      return;
    }

    const fullVoucherCode = `${prefix}${trimmedSuffix}`;

    const finalParticulars =
      particularsMode === "list"
        ? listItems
            .map((it) => it.trim())
            .filter(Boolean)
            .map((it, idx) => `${idx + 1}. ${it}`)
            .join("\n")
        : particulars.trim();

    try {
      await createMutation.mutateAsync({
        voucherCode: fullVoucherCode,
        type: "disbursement",
        status: "draft",
        voucherDate,
        payeeName: payeeName.trim(),
        amount: amount || "0",
        supplierId: supplierId || null,
        supplierName: supplierName.trim() || null,
        purchaseOrderNumber: purchaseOrderNumber.trim() || null,
        particulars: finalParticulars,
        checkNumber: checkNumber.trim() || null,
        isLegacy,
      });

      toast.success(`Disbursement Voucher ${fullVoucherCode} saved as draft.`);

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      toast.error(msg);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 300,
            }}
            className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-bg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text">Create Disbursement Voucher</h2>
                  <p className="text-xs text-text-secondary">
                    Record funds issued by the Property Custodian to purchase items or settle purchase orders
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-bg hover:text-text transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Container (Permanent 2-column layout: Form + PO Search) */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
                {/* Left Column: Form */}
                <form
                  id="voucher-form"
                  onSubmit={handleSubmit}
                  className="space-y-4.5 lg:col-span-7"
                >
                  {/* Voucher Code: Hybrid automated prefix + manual suffix */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text">
                        Voucher Number
                        <span className="text-rose-500 font-bold ml-1">*</span>
                      </label>
                      <span className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    </div>
                    <div className="flex rounded-lg border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                      <div className="flex items-center bg-bg-subtle px-3.5 py-2 border-r border-border text-sm font-semibold text-text select-none">
                        {prefix}
                      </div>
                      <input
                        type="text"
                        value={codeSuffix}
                        onChange={(e) => setCodeSuffix(e.target.value.replace(/\s+/g, ""))}
                        placeholder="000428"
                        maxLength={20}
                        required
                        className="flex-1 bg-transparent px-3.5 py-2 text-sm text-text placeholder:text-text-secondary/50 focus:outline-hidden font-mono font-medium"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-text-secondary">
                      Prefix <code className="font-semibold text-primary">{prefix}</code> is automated; enter the numeric identifier on the right.
                    </p>
                  </div>

                  {/* Classification Badge & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text">
                          Classification
                        </label>
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          Disbursement
                        </span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm font-semibold text-primary">
                        <Receipt className="h-4 w-4 shrink-0" />
                        <span>Disbursement Voucher (DV)</span>
                      </div>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        Funds issued to purchase items or settle POs.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text">
                          Voucher Date
                          <span className="text-rose-500 font-bold ml-1">*</span>
                        </label>
                        <span className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      </div>
                      <input
                        type="date"
                        value={voucherDate}
                        onChange={(e) => setVoucherDate(e.target.value)}
                        required
                        className="w-full rounded-lg border border-border bg-bg px-3.5 py-2 text-sm text-text focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Legacy / Unlinked Toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-bg-subtle/40 p-3.5">
                    <div className="flex items-center gap-3">
                      <input
                        id="legacy-toggle"
                        type="checkbox"
                        checked={isLegacy}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsLegacy(checked);
                          if (checked) {
                            handleClearPO();
                          }
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                      />
                      <label htmlFor="legacy-toggle" className="text-xs font-semibold text-text cursor-pointer select-none">
                        Historical / Legacy Voucher Entry
                        <span className="block text-[11px] font-normal text-text-secondary">
                          Use for backlog or historical vouchers without an existing system PO.
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Linked PO Badge (If selected) */}
                  {purchaseOrderNumber && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <Boxes className="h-4 w-4" />
                        <span>Linked to PO #{purchaseOrderNumber}</span>
                        <span className="text-[10px] font-normal text-text-secondary bg-bg px-1.5 py-0.5 rounded border border-border/60">
                          Line items auto-filled
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearPO}
                        className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        Clear Link
                      </button>
                    </motion.div>
                  )}

                  {/* Payee Name & Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text">
                          Payee / Disbursed To
                          <span className="text-rose-500 font-bold ml-1">*</span>
                        </label>
                        <span className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      </div>
                      <input
                        type="text"
                        value={payeeName}
                        onChange={(e) => setPayeeName(e.target.value)}
                        placeholder="e.g. Purchaser Name or Supplier"
                        required
                        className="w-full rounded-lg border border-border bg-bg px-3.5 py-2 text-sm text-text placeholder:text-text-secondary/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <p className="mt-1 text-[11px] text-text-secondary">
                        Person or entity receiving funds from Property Custodian to make the purchase.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text">
                          Amount (PHP)
                          <span className="text-rose-500 font-bold ml-1">*</span>
                        </label>
                        <span className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        className="w-full rounded-lg border border-border bg-bg px-3.5 py-2 text-sm font-mono text-text placeholder:text-text-secondary/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <p className="mt-1 text-[11px] text-text-secondary">
                        Total funds disbursed for this purchase.
                      </p>
                    </div>
                  </div>

                  {/* Supplier & Reference Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text">
                          Supplier / Merchant
                        </label>
                        <span className="text-[11px] text-text-secondary">
                          Optional
                        </span>
                      </div>
                      <input
                        type="text"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder="Store, vendor, or merchant"
                        className="w-full rounded-lg border border-border bg-bg px-3.5 py-2 text-sm text-text placeholder:text-text-secondary/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text">
                          Check / Ref No.
                        </label>
                        <span className="text-[11px] text-text-secondary">
                          Optional
                        </span>
                      </div>
                      <input
                        type="text"
                        value={checkNumber}
                        onChange={(e) => setCheckNumber(e.target.value)}
                        placeholder="e.g. Check #, OR #, or Trans ID"
                        className="w-full rounded-lg border border-border bg-bg px-3.5 py-2 text-sm font-mono text-text placeholder:text-text-secondary/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Particulars / Purpose of Purchase */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text">
                          Particulars / Purpose
                        </label>
                        <span className="text-[11px] text-text-secondary">
                          Optional
                        </span>
                      </div>

                      {/* Paragraph vs List Mode Toggle */}
                      <div className="flex items-center gap-0.5 bg-bg-subtle p-0.5 rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() => handleSwitchMode("paragraph")}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                            particularsMode === "paragraph"
                              ? "bg-accent text-accent-foreground shadow-2xs"
                              : "text-text-secondary hover:text-text"
                          )}
                          title="Free-form paragraph description"
                        >
                          <AlignLeft className="h-3 w-3" />
                          Paragraph
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchMode("list")}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                            particularsMode === "list"
                              ? "bg-accent text-accent-foreground shadow-2xs"
                              : "text-text-secondary hover:text-text"
                          )}
                          title="Itemized list with dynamic rows"
                        >
                          <ListOrdered className="h-3 w-3" />
                          List
                        </button>
                      </div>
                    </div>

                    {particularsMode === "paragraph" ? (
                      <textarea
                        rows={3}
                        value={particulars}
                        onChange={(e) => setParticulars(e.target.value)}
                        placeholder="Specify what items/materials are to be purchased with the disbursed funds..."
                        className="w-full rounded-lg border border-border bg-bg p-3 text-sm text-text placeholder:text-text-secondary/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      />
                    ) : (
                      <div className="rounded-lg border border-border bg-bg-subtle/30 p-2.5 space-y-2">
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {listItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-bg border border-border text-xs font-mono font-semibold text-text-secondary shrink-0">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => handleItemChange(idx, e.target.value)}
                                onKeyDown={handleItemKeyDown}
                                placeholder={`Item or purpose #${idx + 1}...`}
                                className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text placeholder:text-text-secondary/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                disabled={listItems.length <= 1 && idx === 0 && !item}
                                className="p-1.5 text-text-secondary hover:text-red-500 rounded-lg hover:bg-bg transition-colors cursor-pointer disabled:opacity-30 disabled:hover:text-text-secondary disabled:cursor-not-allowed"
                                title="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          <span className="text-[11px] text-text-secondary">
                            Press <kbd className="px-1 py-0.5 text-[10px] font-mono bg-bg rounded border border-border">Enter</kbd> to add row
                          </span>
                          <button
                            type="button"
                            onClick={handleAddItem}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text bg-bg hover:bg-bg-subtle border border-border rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            <Plus className="h-3 w-3" />
                            Add Item
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </form>

                {/* Right Column: PO Explorer (Disabled when legacy mode is selected) */}
                <div
                  className={cn(
                    "lg:col-span-5 flex flex-col rounded-lg border border-border bg-bg-subtle/40 p-4 space-y-3 transition-opacity",
                    isLegacy && "opacity-75"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-text">
                      <Boxes className="h-4 w-4 text-primary" />
                      <span>Select Existing Purchase Order</span>
                    </div>
                    {isLegacy ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <Lock className="h-3 w-3" />
                        Disabled
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-secondary font-medium">
                        {filteredPOs.length} available
                      </span>
                    )}
                  </div>

                  {/* Warning banner when in legacy mode */}
                  {isLegacy && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>Historical mode active: Linking existing POs is disabled.</span>
                    </div>
                  )}

                  {/* PO Search Box */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                    <input
                      type="text"
                      disabled={isLegacy}
                      value={poSearch}
                      onChange={(e) => setPoSearch(e.target.value)}
                      placeholder={isLegacy ? "PO search disabled in legacy mode" : "Search PO#, supplier, or item..."}
                      className={cn(
                        "w-full rounded-lg border border-border bg-bg pl-8 pr-7 py-1.5 text-xs text-text placeholder:text-text-secondary/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        isLegacy && "cursor-not-allowed bg-bg-subtle opacity-70"
                      )}
                    />
                    {poSearch && !isLegacy && (
                      <button
                        type="button"
                        onClick={() => setPoSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* PO List */}
                  <div
                    className={cn(
                      "flex-1 min-h-107.5 max-h-125 overflow-y-auto divide-y divide-border/60 rounded-lg border border-border bg-bg",
                      isLegacy && "pointer-events-none select-none cursor-not-allowed opacity-60"
                    )}
                  >
                    {filteredPOs.length > 0 ? (
                      filteredPOs.map((po) => {
                        const isSelected = purchaseOrderNumber === po.poNumber;
                        return (
                          <div
                            key={po.poNumber}
                            onClick={() => {
                              if (!isLegacy) handleSelectPO(po);
                            }}
                            className={cn(
                              "p-3 text-xs transition-colors group",
                              isLegacy ? "cursor-not-allowed opacity-75" : "cursor-pointer hover:bg-bg-subtle/70",
                              isSelected && "bg-primary/10 border-l-4 border-l-primary"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div
                                className={cn(
                                  "font-mono font-bold text-text transition-colors",
                                  !isLegacy && "group-hover:text-primary"
                                )}
                              >
                                #{po.poNumber}
                              </div>
                              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatPhp(po.totalCost)}
                              </div>
                            </div>

                            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-text-secondary">
                              <div className="flex items-center gap-1 max-w-50 truncate">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">{po.representative.supplierName || "No Supplier"}</span>
                              </div>
                              <span>{po.itemCount} item(s)</span>
                            </div>

                            <div className="mt-1 text-[11px] text-text-secondary truncate">
                              {po.representative.itemName}
                            </div>

                            <div className="mt-2 flex items-center justify-end">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                                  <Check className="h-3 w-3" />
                                  <span>Selected</span>
                                </span>
                              ) : !isLegacy ? (
                                <span className="text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                  Click to Auto-fill &rarr;
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-text-secondary">
                        No purchase orders match your search.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-border bg-bg-subtle/50 flex items-center justify-between shrink-0">
              <div className="text-xs text-text-secondary">
                {isLegacy ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Historical / Legacy mode: Purchase Order selection is disabled.</span>
                  </span>
                ) : (
                  <span>
                    Tip: Selecting a PO auto-fills the payee, amount, and purchase particulars.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-text hover:bg-bg-subtle transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="voucher-form"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FilePlus2 className="h-4 w-4" />
                      <span>Create Voucher</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
