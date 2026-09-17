"use client";

import { useEffect, useState } from "react";
import { Plus, Send, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RequisitionItemRow } from "./RequisitionItemRow";
import { SignatureBlock } from "./SignatureBlock";
import type { RequisitionItem } from "./types";
import { useCreateConsumableRequestMutation } from "@/features/consumable-requests/client/use-consumable-requests";
import { useConsumablesQuery } from "@/features/consumables/client/use-consumables";
import { useMeQuery } from "@/features/users/client/use-users";
import { useToast } from "@/components/providers/toast-context";

function generateEmptyRow(): RequisitionItem {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    qty: null,
    description: "",
    costCenterCode: "",
    suggestedDealer: "",
    purpose: "",
    estimatedCost: null,
  };
}

export function RequisitionSlip({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<RequisitionItem[]>(() =>
    Array.from({ length: 4 }).map(() => generateEmptyRow())
  );
  
  const [requisitionedBy, setRequisitionedBy] = useState("");
  const [recommendingPerson, setRecommendingPerson] = useState("");
  const [budgetOfficer, setBudgetOfficer] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { data: me } = useMeQuery();
  const { data: catalogPage } = useConsumablesQuery({ limit: 100 });
  const catalog = catalogPage?.data ?? [];
  const { mutateAsync: createConsumableRequest, isPending: isSubmitting } =
    useCreateConsumableRequestMutation();
  const toast = useToast();

  useEffect(() => {
    if (!open) {
      setRequisitionedBy("");
      return;
    }
  }, [open]);

  const approvedBy = { name: "Mr. Victor Elliot S. Lepiten, III", title: "President" };

  const addRow = () => {
    setItems((prev) => [...prev, generateEmptyRow()]);
  };

  const removeRow = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const updateItem = (
    id: string,
    field: keyof RequisitionItem,
    value: RequisitionItem[keyof RequisitionItem]
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const totalCost = items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);

  const handleSubmit = async () => {
    setError("");
    setSuccess(false);

    // Validation: at least one row must have qty and description
    const hasValidRow = items.some((item) => item.qty && item.qty > 0 && item.description.trim());
    if (!hasValidRow) {
      setError("Please fill out at least one item with a valid quantity and description.");
      return;
    }
    
    if (!requisitionedBy.trim()) {
      setError("Please enter your name in the 'Requisitioned by' field.");
      return;
    }

    if (!me?.id || !me.email) {
      setError("Your profile could not be loaded. Sign in again and retry.");
      return;
    }
    if (!me.departmentId) {
      setError(
        "This login is not linked to a department. Ask an administrator to assign one."
      );
      return;
    }

    const validItems = items.filter(
      (item) => item.qty && item.qty > 0 && item.description.trim()
    );
    const unmatched: string[] = [];
    const linesByConsumableId = new Map<string, { quantity: number; notes?: string }>();

    for (const item of validItems) {
      const needle = item.description.trim().toLowerCase();
      const match = catalog.find(
        (c) =>
          c.name.toLowerCase() === needle ||
          c.itemCode.toLowerCase() === needle
      );
      if (!match) {
        unmatched.push(item.description.trim());
        continue;
      }
      const extra = [
        item.costCenterCode.trim()
          ? `cost center ${item.costCenterCode.trim()}`
          : null,
        item.suggestedDealer.trim()
          ? `dealer ${item.suggestedDealer.trim()}`
          : null,
        item.estimatedCost != null ? `est. ${item.estimatedCost}` : null,
      ].filter(Boolean);
      const existing = linesByConsumableId.get(match.id);
      const quantity = (existing?.quantity ?? 0) + (item.qty ?? 1);
      const notes = [...(existing?.notes ? [existing.notes] : []), ...extra].join(
        "; "
      );
      linesByConsumableId.set(match.id, {
        quantity,
        notes: notes || undefined,
      });
    }

    if (unmatched.length > 0) {
      setError(
        `Unknown catalog supply: ${unmatched.join(", ")}. Use the exact item name or code from Browse.`
      );
      return;
    }

    const purpose =
      validItems.find((item) => item.purpose.trim())?.purpose.trim() ||
      "Supplies requisition";
    const notesParts = [
      `Slip date: ${date}`,
      recommendingPerson.trim()
        ? `Recommending: ${recommendingPerson.trim()}`
        : null,
      budgetOfficer.trim() ? `Budget officer: ${budgetOfficer.trim()}` : null,
    ].filter(Boolean);

    try {
      await createConsumableRequest({
        requesterUserId: me.id,
        requesterName: requisitionedBy.trim(),
        requesterEmail: me.email,
        departmentId: me.departmentId,
        purpose,
        notes: notesParts.join(" · ") || undefined,
        lines: [...linesByConsumableId.entries()].map(([consumableId, line]) => ({
          consumableId,
          quantity: line.quantity,
          notes: line.notes,
        })),
      });
      toast.success("Requisition submitted.");
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setItems(Array.from({ length: 4 }).map(() => generateEmptyRow()));
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit requisition.");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="requisition-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSubmitting && onOpenChange(false)}
        aria-hidden="true"
      />
      
      <div className="relative z-10 w-full max-w-5xl max-h-full bg-card border border-primary/20 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header section */}
        <div className="px-8 py-6 border-b border-primary/20 flex flex-col items-center relative shrink-0">
          <h1 id="requisition-title" className="text-xl font-bold tracking-widest text-primary uppercase">CRMC-AIMS</h1>
          <h2 className="text-sm font-semibold tracking-widest text-primary mt-1">Requisition Slip</h2>
          
          <div className="absolute right-8 top-6 flex items-center gap-2">
            <label className="text-xs font-semibold text-primary uppercase tracking-wider">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 rounded px-2 text-sm text-text bg-bg-subtle border border-primary/20 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Table Header */}
          <div className="w-full">
        <div className="w-full">
          {/* Table Header */}
          <div className="flex items-center gap-2 px-2 py-2 bg-primary/5 border-b border-primary/20">
            <div className="w-8 shrink text-[10px] font-bold text-primary uppercase tracking-wider text-center">#</div>
            <div className="w-20 shrink text-[10px] font-bold text-primary uppercase tracking-wider">QTY.</div>
            <div className="flex-1 min-w-50 text-[10px] font-bold text-primary uppercase tracking-wider px-2">Description</div>
            <div className="w-32 shrink text-[10px] font-bold text-primary uppercase tracking-wider">Cost Center Code</div>
            <div className="w-40 shrink text-[10px] font-bold text-primary uppercase tracking-wider">Suggested Dealer</div>
            <div className="w-48 shrink text-[10px] font-bold text-primary uppercase tracking-wider">Purpose</div>
            <div className="w-32 shrink text-[10px] font-bold text-primary uppercase tracking-wider text-right pr-2">Estimated Cost</div>
            <div className="w-10 shrink"></div>
          </div>

          {/* Table Body */}
          <div className="flex flex-col">
            {items.map((item, index) => (
              <RequisitionItemRow
                key={item.id}
                item={item}
                index={index}
                isRemovable={items.length > 1}
                onChange={updateItem}
                onRemove={removeRow}
              />
            ))}
          </div>
          
          {/* Table Footer */}
          <div className="flex items-center gap-2 px-2 py-3 bg-primary/5 border-b border-primary/20">
            <div className="flex-1"></div>
            <div className="text-xs font-bold text-primary uppercase tracking-wider pr-4">Total:</div>
            <div className="w-32 shrink text-sm font-bold text-primary text-right pr-2">
              ₱{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="w-10 shrink"></div>
          </div>
        </div>
      </div>

      <div className="p-4 flex justify-start border-b border-border">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-accent hover:bg-accent/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>
      </div>

      {/* Signature section */}
      <div className="px-8 pt-8 pb-10 flex flex-col gap-10">
        <p className="text-xs italic text-text-secondary text-center">
          &ldquo;Above items are very much needed in the performance of our functions.&rdquo;
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          <div className="flex flex-col items-center gap-1.5">
            <SignatureBlock
              label="Requisitioned by"
              nameValue={requisitionedBy}
              onNameChange={setRequisitionedBy}
            />
            {me?.name &&
              requisitionedBy.trim() !== me.name.trim() && (
                <button
                  type="button"
                  onClick={() => setRequisitionedBy(me.name)}
                  className="text-[10px] font-semibold text-accent hover:underline cursor-pointer"
                >
                  Use registered name
                </button>
              )}
          </div>
          <SignatureBlock
            label="Recommending Office / Person"
            nameValue={recommendingPerson}
            onNameChange={setRecommendingPerson}
          />
          <SignatureBlock
            label="Budget Officer"
            nameValue={budgetOfficer}
            onNameChange={setBudgetOfficer}
          />
          <SignatureBlock
            label="Approved by"
            nameValue={approvedBy.name}
            titleCaption={approvedBy.title}
            readOnly
          />
        </div>
      </div>
    </div>

      {/* Footer Actions */}
      <div className="px-8 py-5 bg-bg-subtle border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex-1 w-full sm:w-auto">
          {error && (
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-xs font-medium">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-status-active-bg dark:text-status-active-text">
              <p className="text-xs font-semibold">Requisition submitted successfully!</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-text-secondary hover:bg-bg-subtle hover:text-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || success}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSubmitting ? "Submitting..." : "Submit Requisition"}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
