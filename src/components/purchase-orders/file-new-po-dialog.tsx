"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  FilePlus2,
  Plus,
  Trash2,
  Calendar,
  User,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Sparkles,
  Building2,
  Tag,
  Boxes,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Edit3,
  FileText,
  Laptop,
  Search,
  School,
  Receipt,
  Lock,
} from "lucide-react";
import { useMeQuery } from "@/features/users/client/use-users";
import { useSuppliersQuery } from "@/features/suppliers/client";
import { useDepartmentsQuery } from "@/features/departments/client";
import { useCategoriesQuery } from "@/features/categories/client/use-categories";
import { useConsumablesQuery } from "@/features/consumables/client";
import { useAssetsQuery } from "@/features/assets/client";
import { useCreatePurchaseOrderMutation } from "@/features/purchase-lots/client";
import { useToast } from "@/components/providers/toast-context";
import { cn } from "@/lib/utils";
import {
  filterMoneyInput,
  filterUnsignedIntInput,
  parseMoney,
  parseUnsignedInt,
} from "@/lib/numeric-input";
import { formatPhp } from "@/components/projects/format-money";
import {
  CONSUMABLE_CLASSIFICATIONS,
  CONSUMABLE_CLASSIFICATION_LABELS,
  DEFAULT_CONSUMABLE_CLASSIFICATION,
  type ConsumableClassification,
} from "@/lib/consumable-classification";

interface FileNewPODialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultPoType?: POType;
  defaultPurpose?: string;
}

export type POType = "consumable" | "asset";

interface POLineItemForm {
  id: string;
  isNew: boolean;
  consumableId?: string;
  assetId?: string;
  name: string;
  category: string;
  classification: ConsumableClassification;
  unit: string;
  minThreshold: number;
  location: string;
  assignmentType: "borrowable" | "assignable";
  model: string;
  quantity: string;
  unitCost: string;
  suggestedDealer: string;
  supplierId?: string;
  purpose: string;
}

type WizardStep = "details" | "items" | "review";

const STEPS: Array<{ id: WizardStep; label: string; description: string; icon: React.ElementType }> = [
  { id: "details", label: "PO Details", description: "Type, department & purpose", icon: FileText },
  { id: "items", label: "Line Items", description: "Items, suppliers & costs", icon: Boxes },
  { id: "review", label: "Final Review", description: "Verify order specifications", icon: CheckCircle2 },
];

let poLineRowIdSeq = 0;

function createPoLineRowId(): string {
  poLineRowIdSeq += 1;
  return `row-${poLineRowIdSeq}`;
}

function generateInitialRow(poType: POType = "consumable", isNew = false): POLineItemForm {
  return {
    id: createPoLineRowId(),
    isNew,
    name: "",
    category: "",
    classification: DEFAULT_CONSUMABLE_CLASSIFICATION,
    unit: poType === "asset" ? "unit" : "pcs",
    minThreshold: 5,
    location: "Main Property Supply",
    assignmentType: "borrowable",
    model: "",
    quantity: "1",
    unitCost: "",
    suggestedDealer: "",
    purpose: "",
  };
}

export function FileNewPODialog({
  isOpen,
  onClose,
  onSuccess,
  defaultPoType,
  defaultPurpose,
}: FileNewPODialogProps) {
  const { data: me } = useMeQuery();
  // Prefetch while the PO page is mounted so the department select is warm
  // when the dialog opens (avoids racing the slow first DB connection).
  const {
    data: departmentsData,
    isLoading: departmentsLoading,
    isError: departmentsError,
    refetch: refetchDepartments,
  } = useDepartmentsQuery();
  const departments = Array.isArray(departmentsData) ? departmentsData : [];
  const { data: suppliers = [] } = useSuppliersQuery({
    activeOnly: true,
    enabled: isOpen,
  });
  const { data: allCategories = [] } = useCategoriesQuery({ enabled: isOpen });
  const { data: consumablePage } = useConsumablesQuery({ limit: 100 });
  const consumables = useMemo(
    () => consumablePage?.data ?? [],
    [consumablePage?.data]
  );
  const { data: assetsList = [] } = useAssetsQuery();

  const createPOMutation = useCreatePurchaseOrderMutation();
  const toast = useToast();

  const consumableCategories = useMemo(
    () => allCategories.filter((c) => c.type === "consumable"),
    [allCategories]
  );
  const assetCategories = useMemo(
    () => allCategories.filter((c) => c.type === "asset"),
    [allCategories]
  );

  const defaultConsumableCategory = consumableCategories[0]?.name ?? "General Supply";
  const defaultAssetCategory = assetCategories[0]?.name ?? "Equipment";

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("details");

  // Step 1 states
  const [poType, setPoType] = useState<POType>("consumable");
  const [poNumberMode, setPoNumberMode] = useState<"auto" | "manual">("auto");
  const [customPoNumber, setCustomPoNumber] = useState("");
  const [poDate, setPoDate] = useState(() => new Date().toISOString().split("T")[0]);
  const accountRequesterName = me?.name || me?.email || "Authorized Staff";
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [generalPurpose, setGeneralPurpose] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  // Step 2 Line items & catalog quick-add states
  const [items, setItems] = useState<POLineItemForm[]>([generateInitialRow("consumable", false)]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("all");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialType = defaultPoType || "consumable";
      setCurrentStep("details");
      setPoType(initialType);
      setPoNumberMode("auto");
      setCustomPoNumber("");
      setPoDate(new Date().toISOString().split("T")[0]);
      setItems([generateInitialRow(initialType, false)]);
      setCatalogSearch("");
      setCatalogCategoryFilter("all");
      setErrorMessage(null);
      setTargetDepartmentId(me?.departmentId || "");
      setGeneralPurpose(defaultPurpose || "");
      setGeneralNotes("");
    }
  }, [isOpen, me?.departmentId, defaultPoType, defaultPurpose]);

  // Safe Close Guard to prevent accidental data loss
  const handleSafeClose = () => {
    const hasData =
      Boolean(customPoNumber.trim()) ||
      Boolean(generalPurpose.trim()) ||
      Boolean(generalNotes.trim()) ||
      Boolean(targetDepartmentId.trim() && targetDepartmentId !== (me?.departmentId || "")) ||
      items.some((i) => Boolean(i.name.trim()) || Boolean(i.consumableId) || Boolean(i.assetId));

    if (hasData) {
      const confirmed = window.confirm(
        "Are you sure you want to discard this Purchase Order? All entered details and line items will be lost."
      );
      if (!confirmed) return;
    }
    onClose();
  };

  // Handle change of PO Type in Step 1 (resets items accordingly)
  const handlePoTypeChange = (newType: POType) => {
    if (newType === poType) return;
    setPoType(newType);
    setCatalogSearch("");
    setCatalogCategoryFilter("all");
    setItems([generateInitialRow(newType, false)]);
  };

  const handleAddItem = (isNew = false) => {
    const newRow = generateInitialRow(poType, isNew);
    if (isNew) {
      newRow.category = poType === "asset" ? defaultAssetCategory : defaultConsumableCategory;
    }
    setItems((prev) => [...prev, newRow]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setItems([generateInitialRow(poType, false)]);
      toast.info("Cleared line item inputs");
    }
  };

  const handleClearCatalogItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((it) => it.id !== id));
    } else {
      setItems([generateInitialRow(poType, false)]);
    }
    toast.info("Unselected item and erased inputs");
  };

  const handleToggleItemNew = (id: string, isNew: boolean) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          isNew,
          consumableId: undefined,
          assetId: undefined,
          name: "",
          category: isNew
            ? poType === "asset"
              ? defaultAssetCategory
              : defaultConsumableCategory
            : "",
          classification: DEFAULT_CONSUMABLE_CLASSIFICATION,
          unit: poType === "asset" ? "unit" : "pcs",
        };
      })
    );
  };

  // Quick-Add & Quick-Unselect from Catalog Cards
  const handleQuickAddConsumable = (c: (typeof consumables)[number]) => {
    const matchedSup = suppliers.find(
      (s) =>
        s.name.toLowerCase() === (c.supplier || "").toLowerCase() ||
        s.id === c.supplier
    );

    const existingIdx = items.findIndex((it) => !it.isNew && it.consumableId === c.id);
    if (existingIdx >= 0) {
      if (items.length > 1) {
        setItems((prev) => prev.filter((_, idx) => idx !== existingIdx));
      } else {
        setItems([generateInitialRow(poType, false)]);
      }
      toast.info(`Unselected "${c.name}" and erased inputs`);
      return;
    }

    const isBlankInitial =
      items.length === 1 &&
      !items[0].name.trim() &&
      !items[0].consumableId &&
      !items[0].assetId;

    const newRow: POLineItemForm = {
      id: createPoLineRowId(),
      isNew: false,
      consumableId: c.id,
      name: c.name,
      category: c.category,
      classification: c.classification ?? DEFAULT_CONSUMABLE_CLASSIFICATION,
      unit: c.unit || "pcs",
      minThreshold: c.minThreshold || 5,
      location: c.location || "Main Property Storage",
      assignmentType: "borrowable",
      model: "",
      quantity: "1",
      unitCost: "",
      suggestedDealer: c.supplier || matchedSup?.name || "",
      supplierId: matchedSup?.id,
      purpose: generalPurpose || "",
    };

    if (isBlankInitial) {
      setItems([newRow]);
    } else {
      setItems((prev) => [...prev, newRow]);
    }
    toast.success(`Added "${c.name}" to PO items`);
  };

  const handleQuickAddAsset = (a: (typeof assetsList)[number]) => {
    const existingIdx = items.findIndex((it) => !it.isNew && it.assetId === a.id);
    if (existingIdx >= 0) {
      if (items.length > 1) {
        setItems((prev) => prev.filter((_, idx) => idx !== existingIdx));
      } else {
        setItems([generateInitialRow(poType, false)]);
      }
      toast.info(`Unselected "${a.name}" and erased inputs`);
      return;
    }

    const isBlankInitial =
      items.length === 1 &&
      !items[0].name.trim() &&
      !items[0].consumableId &&
      !items[0].assetId;

    const newRow: POLineItemForm = {
      id: createPoLineRowId(),
      isNew: false,
      assetId: a.id,
      name: a.name,
      category: a.category,
      classification: DEFAULT_CONSUMABLE_CLASSIFICATION,
      unit: "unit",
      minThreshold: 5,
      location: a.location || "Main Property Storage",
      assignmentType: a.assignmentType || "borrowable",
      model: a.modelId || "",
      quantity: "1",
      unitCost: a.value ? String(a.value) : "",
      suggestedDealer: "",
      supplierId: undefined,
      purpose: generalPurpose || "",
    };

    if (isBlankInitial) {
      setItems([newRow]);
    } else {
      setItems((prev) => [...prev, newRow]);
    }
    toast.success(`Added "${a.name}" to PO items`);
  };

  const handleSelectExistingConsumable = (id: string, consumableId: string) => {
    const matched = consumables.find((c) => c.id === consumableId);
    if (!matched) return;
    const supObj = suppliers.find(
      (s) =>
        s.name.toLowerCase() === (matched.supplier || "").toLowerCase() ||
        s.id === matched.supplier
    );
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          consumableId: matched.id,
          name: matched.name,
          category: matched.category,
          classification:
            matched.classification ?? DEFAULT_CONSUMABLE_CLASSIFICATION,
          unit: matched.unit,
          location: matched.location,
          suggestedDealer: matched.supplier || item.suggestedDealer || supObj?.name || "",
          supplierId: supObj?.id || item.supplierId,
        };
      })
    );
  };

  const handleSelectExistingAsset = (id: string, assetId: string) => {
    const matched = assetsList.find((a) => a.id === assetId);
    if (!matched) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          assetId: matched.id,
          name: matched.name,
          category: matched.category,
          unit: "unit",
          location: matched.location,
          assignmentType: matched.assignmentType || "borrowable",
          unitCost: matched.value ? String(matched.value) : item.unitCost,
        };
      })
    );
  };

  const handleItemFieldChange = (
    id: string,
    field: keyof POLineItemForm,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const strVal = String(value);

        if (field === "quantity") {
          const next = filterUnsignedIntInput(strVal);
          return next === null ? item : { ...item, quantity: next };
        }

        if (field === "unitCost") {
          const next = filterMoneyInput(strVal);
          return next === null ? item : { ...item, unitCost: next };
        }

        if (field === "minThreshold") {
          const num = typeof value === "number" ? value : parseInt(strVal, 10) || 0;
          return { ...item, minThreshold: num };
        }

        if (field === "suggestedDealer") {
          const matchedSup = suppliers.find(
            (s) =>
              s.name.toLowerCase() === strVal.trim().toLowerCase() ||
              s.id === strVal
          );
          return {
            ...item,
            suggestedDealer: strVal,
            supplierId: matchedSup?.id,
          };
        }

        return { ...item, [field]: strVal };
      })
    );
  };

  const totalEstimatedAmount = items.reduce((sum, item) => {
    const qty = parseUnsignedInt(item.quantity, 0);
    const unitPrice = parseMoney(item.unitCost) ?? 0;
    return sum + qty * unitPrice;
  }, 0);

  // Filtered Catalog Items for Click-to-Add
  const filteredConsumableCatalog = useMemo(() => {
    return consumables.filter((c) => {
      const q = catalogSearch.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.itemCode.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.supplier && c.supplier.toLowerCase().includes(q));

      const matchCategory =
        catalogCategoryFilter === "all" || c.category === catalogCategoryFilter;

      return matchQuery && matchCategory;
    });
  }, [consumables, catalogSearch, catalogCategoryFilter]);

  const filteredAssetCatalog = useMemo(() => {
    return assetsList.filter((a) => {
      const q = catalogSearch.toLowerCase().trim();
      const matchQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.assetCode.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.location && a.location.toLowerCase().includes(q));

      const matchCategory =
        catalogCategoryFilter === "all" || a.category === catalogCategoryFilter;

      return matchQuery && matchCategory;
    });
  }, [assetsList, catalogSearch, catalogCategoryFilter]);

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    setErrorMessage(null);
    if (poNumberMode === "manual" && !customPoNumber.trim()) {
      setErrorMessage("Please enter a manual PO Number or switch to Auto-generate.");
      return false;
    }
    if (!poDate) {
      setErrorMessage("Order date is required.");
      return false;
    }
    if (!targetDepartmentId.trim()) {
      setErrorMessage("Target department is required.");
      return false;
    }
    if (!generalPurpose.trim()) {
      setErrorMessage("Procurement purpose is required.");
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    setErrorMessage(null);
    if (items.length === 0) {
      setErrorMessage("Please add at least one line item.");
      return false;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const idxStr = `Item #${i + 1}`;
      if (!item.name.trim()) {
        setErrorMessage(`${idxStr}: Item name / selection is required.`);
        return false;
      }
      const qty = parseUnsignedInt(item.quantity, 0);
      if (qty < 1) {
        setErrorMessage(`${idxStr}: Quantity must be at least 1.`);
        return false;
      }
      const unitCost = parseMoney(item.unitCost);
      if (unitCost === null || unitCost < 0) {
        setErrorMessage(`${idxStr}: Please provide a valid unit cost.`);
        return false;
      }
    }
    return true;
  };

  const handleNextFromDetails = () => {
    if (validateStep1()) {
      setCurrentStep("items");
    }
  };

  const handleNextFromItems = () => {
    if (validateStep2()) {
      setCurrentStep("review");
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!validateStep1() || !validateStep2()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedItems = items.map((item) => {
        const isAsset = poType === "asset";
        const qty = parseUnsignedInt(item.quantity, 1);
        const unitCostNum = parseMoney(item.unitCost) ?? 0;

        return {
          itemType: poType,
          consumableId: !item.isNew && !isAsset ? item.consumableId : undefined,
          assetId: !item.isNew && isAsset ? item.assetId : undefined,
          isNewItem: item.isNew,
          name: item.name.trim(),
          category: item.category.trim() || (isAsset ? defaultAssetCategory : defaultConsumableCategory),
          classification: !isAsset
            ? item.classification || DEFAULT_CONSUMABLE_CLASSIFICATION
            : undefined,
          unit: item.unit || (isAsset ? "unit" : "pcs"),
          minThreshold: item.minThreshold || 5,
          location: item.location || "Main Property Storage",
          assignmentType: item.assignmentType || "borrowable",
          model: item.model || undefined,
          quantity: qty,
          unitCost: unitCostNum,
          purpose: item.purpose || generalPurpose || undefined,
          suggestedDealer: item.suggestedDealer || undefined,
          supplierId: item.supplierId || undefined,
        };
      });

      const uniqueSuppliers = Array.from(
        new Set(items.map((it) => it.suggestedDealer?.trim()).filter(Boolean))
      );
      const masterSupplierName =
        uniqueSuppliers.length === 1
          ? uniqueSuppliers[0]
          : uniqueSuppliers.length > 1
          ? "Multiple Suppliers"
          : undefined;
      const masterSupplierId =
        uniqueSuppliers.length === 1 ? items[0]?.supplierId : undefined;

      const selectedDepartment = departments.find((d) => d.id === targetDepartmentId);
      const departmentName = selectedDepartment?.name?.trim() || "";
      if (!departmentName) {
        setErrorMessage("Please select a valid target department.");
        return;
      }

      const combinedPurpose = `[${departmentName}] ${generalPurpose.trim()}`;

      await createPOMutation.mutateAsync({
        poNumber: poNumberMode === "manual" ? customPoNumber.trim() : undefined,
        poDate,
        requestedBy: accountRequesterName,
        supplierId: masterSupplierId,
        supplierName: masterSupplierName,
        departmentId: targetDepartmentId,
        departmentName,
        purpose: combinedPurpose,
        notes: generalNotes.trim() || undefined,
        status: "pending_approval",
        items: formattedItems,
      });

      toast.success(
        `${poType === "asset" ? "Asset" : "Consumable"} Purchase Order filed successfully with ${items.length} item(s).`
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to file Purchase Order.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStepIdx = STEPS.findIndex((s) => s.id === currentStep);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop (Static - Not closable on click) */}
      <div className="absolute inset-0" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-po-title"
        className="relative w-full max-w-4xl h-[92vh] max-h-205 min-h-160 rounded-2xl border border-border bg-bg shadow-2xl z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header with Title */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10 border border-accent/20 text-accent">
              <FilePlus2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="new-po-title" className="text-base font-bold text-text flex items-center gap-2">
                File New Purchase Order
              </h2>
              <p className="text-[11px] text-text-secondary">
                Official Cebu Roosevelt Memorial Colleges Property Acquisition Slip
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSafeClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-border/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3-Step Wizard Navigation Stepper */}
        <div className="px-6 py-3 bg-card border-b border-border shrink-0">
          <div className="flex items-center justify-between max-w-2xl mx-auto relative">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isPassed = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;

              return (
                <React.Fragment key={step.id}>
                  {/* Step Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (idx === 0) setCurrentStep("details");
                      else if (idx === 1 && validateStep1()) setCurrentStep("items");
                      else if (idx === 2 && validateStep1() && validateStep2()) setCurrentStep("review");
                    }}
                    className={cn(
                      "flex items-center gap-2.5 group cursor-pointer transition-all text-left",
                      isCurrent ? "opacity-100" : isPassed ? "opacity-90" : "opacity-50"
                    )}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center border font-bold text-xs transition-all",
                        isPassed
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                          : isCurrent
                          ? "bg-accent text-accent-foreground border-accent shadow-xs scale-105"
                          : "bg-bg-subtle text-text-secondary border-border"
                      )}
                    >
                      {isPassed ? <Check className="h-4 w-4 stroke-3" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="hidden sm:block">
                      <span
                        className={cn(
                          "text-xs font-bold block leading-none",
                          isCurrent ? "text-text" : "text-text-secondary"
                        )}
                      >
                        {step.label}
                      </span>
                      <span className="text-[10px] text-text-secondary mt-0.5 block leading-none">
                        {step.description}
                      </span>
                    </div>
                  </button>

                  {/* Connector Line */}
                  {idx < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-3 sm:mx-4 transition-colors",
                        currentStepIdx > idx ? "bg-accent" : "bg-border"
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 text-status-outofservice-text flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* ================= STEP 1: PO DETAILS & ITEM TYPE ================= */}
          {currentStep === "details" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* 1. Item Classification Selector (Consumables vs Assets) */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-bold text-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-accent" />
                    1. Select Purchase Order Item Classification
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    All items in this PO will be of this type
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePoTypeChange("consumable")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5",
                      poType === "consumable"
                        ? "border-emerald-500/60 bg-emerald-500/10 shadow-xs ring-2 ring-emerald-500/20"
                        : "border-border bg-card hover:bg-bg-subtle/50 hover:border-border"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-text">Consumable Supplies</span>
                        {poType === "consumable" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                        Office supplies, paper, printer ink, cleaning supplies, and recurring stock batches.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePoTypeChange("asset")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5",
                      poType === "asset"
                        ? "border-blue-500/60 bg-blue-500/10 shadow-xs ring-2 ring-blue-500/20"
                        : "border-border bg-card hover:bg-bg-subtle/50 hover:border-border"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                      <Laptop className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-text">Fixed Assets & Equipment</span>
                        {poType === "asset" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                        Laptops, projectors, machinery, lab equipment, and trackable institutional assets.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Master Metadata Form */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-bold text-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-accent" />
                    2. Order Metadata & Authorization
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    Cebu Roosevelt Memorial Colleges, Inc.
                  </span>
                </div>

                {/* PO Numbering Configuration: Auto vs Manual */}
                <div className="p-3.5 rounded-xl border border-border bg-bg-subtle/50 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="font-semibold text-text flex items-center gap-1.5 text-xs">
                      <FileText className="h-3.5 w-3.5 text-accent" />
                      <span>Purchase Order (P.O.) Number</span>
                    </label>
                    <div className="flex items-center gap-1 bg-bg p-0.5 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setPoNumberMode("auto")}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                          poNumberMode === "auto"
                            ? "bg-accent text-accent-foreground shadow-2xs"
                            : "text-text-secondary hover:text-text"
                        )}
                      >
                        Auto-generate
                      </button>
                      <button
                        type="button"
                        onClick={() => setPoNumberMode("manual")}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                          poNumberMode === "manual"
                            ? "bg-accent text-accent-foreground shadow-2xs"
                            : "text-text-secondary hover:text-text"
                        )}
                      >
                        Manual Input
                      </button>
                    </div>
                  </div>

                  {poNumberMode === "auto" ? (
                    <div className="flex items-center justify-between text-xs text-text-secondary bg-bg px-3 py-2 rounded-lg border border-dashed border-border">
                      <span>System will auto-generate an official operational tracking code:</span>
                      <span className="font-mono font-bold text-text bg-bg-subtle px-2 py-0.5 rounded border border-border">
                        PO-{new Date().getFullYear()}-XXXX
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-secondary font-medium">Enter custom / voucher P.O. Number:</span>
                        <span className="text-rose-500 font-bold">* Required</span>
                      </div>
                      <input
                        type="text"
                        value={customPoNumber}
                        onChange={(e) => setCustomPoNumber(e.target.value)}
                        placeholder="e.g. PO-2026-0042, CRMC-PO-101, or voucher reference..."
                        className="w-full h-9 px-3 font-mono font-bold rounded-lg border border-border bg-bg text-text text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden"
                      />
                      <p className="text-[10px] text-text-secondary">
                        Matches physical procurement forms, custodian vouchers, or official accounting documents.
                      </p>
                    </div>
                  )}
                </div>

                {/* Row 1: Date, Requester, and Target Department in 3 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Order Date */}
                  <div className="space-y-1">
                    <label className="font-semibold text-text flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                      Order Date
                    </label>
                    <input
                      type="date"
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      required
                      className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-text text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden"
                    />
                  </div>

                  {/* Requested By (Account) */}
                  <div className="space-y-1">
                    <label className="font-semibold text-text flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-accent" />
                      <span>Requested By (Account)</span>
                    </label>
                    <div className="w-full h-9 px-3 rounded-lg border border-border bg-bg flex items-center justify-between text-xs text-text font-bold select-none">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{accountRequesterName}</span>
                      </div>
                      <span className="text-[10px] text-text-secondary font-medium shrink-0 ml-1">
                        {me?.role || "Account"}
                      </span>
                    </div>
                  </div>

                  {/* Target Department (Dropdown) */}
                  <div className="space-y-1">
                    <label className="font-semibold text-text flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <School className="h-3.5 w-3.5 text-text-secondary" />
                        <span>Target Department</span>
                      </span>
                      <span className="text-[10px] text-rose-500 font-bold">* Required</span>
                    </label>
                    <select
                      value={targetDepartmentId}
                      onChange={(e) => setTargetDepartmentId(e.target.value)}
                      required
                      disabled={departmentsLoading}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-text text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden cursor-pointer font-medium disabled:opacity-60"
                    >
                      <option value="">
                        {departmentsLoading
                          ? "Loading departments…"
                          : departmentsError
                            ? "Failed to load departments"
                            : "-- Choose Department --"}
                      </option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} {dept.code ? `(${dept.code})` : ""}
                        </option>
                      ))}
                    </select>
                    {departmentsError && (
                      <button
                        type="button"
                        onClick={() => void refetchDepartments()}
                        className="text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                      >
                        Retry loading departments
                      </button>
                    )}
                    {!departmentsLoading &&
                      !departmentsError &&
                      departments.length === 0 && (
                        <p className="text-[11px] text-text-secondary">
                          No departments found. Add one under Settings first.
                        </p>
                      )}
                  </div>
                </div>

                {/* Row 2: Purpose & Notes Side-by-Side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-border/60">
                  <div className="space-y-1">
                    <label className="font-semibold text-text flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-text-secondary" />
                        <span>Procurement Purpose</span>
                      </span>
                      <span className="text-[10px] text-rose-500 font-bold">* Required</span>
                    </label>
                    <textarea
                      value={generalPurpose}
                      onChange={(e) => setGeneralPurpose(e.target.value)}
                      placeholder="e.g. Replenishment of registrar office stocks, paper reams, and semester exam supplies..."
                      required
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-border bg-bg text-text text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden resize-none leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-text-secondary" />
                      <span>Order Notes / Budget Justification</span>
                    </label>
                    <textarea
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      placeholder="e.g. Approved under Semester 1 Supply Budget Allocation / Urgently required for midterm examinations..."
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-border bg-bg text-text text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: LINE ITEMS ================= */}
          {currentStep === "items" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Top Section: Catalog Search & Click-To-Add Cards */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
                      <Search className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-xs text-text">
                      {poType === "asset" ? "Asset Catalog" : "Consumables Catalog"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddItem(true)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer shadow-2xs",
                        poType === "asset"
                          ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      )}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>+ Custom / New {poType === "asset" ? "Asset" : "Consumable"}</span>
                    </button>
                  </div>
                </div>

                {/* Search Bar & Category Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder={`Search ${poType === "asset" ? "assets" : "consumable stocks"} by name, SKU, or category…`}
                      className="w-full h-8.5 pl-8.5 pr-8 rounded-lg border border-border bg-bg text-text text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden"
                    />
                    {catalogSearch && (
                      <button
                        type="button"
                        onClick={() => setCatalogSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-secondary hover:text-text cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <select
                      value={catalogCategoryFilter}
                      onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                      className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-bg text-text text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">All Categories</option>
                      {(poType === "asset" ? assetCategories : consumableCategories).map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Clickable Catalog Items Non-scrollable 5-Column Grid (Max 10 - 2 Rows) */}
                <div className="p-1 rounded-xl bg-bg-subtle/40 border border-border/60">
                  {poType === "consumable" ? (
                    filteredConsumableCatalog.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-1">
                        {filteredConsumableCatalog.slice(0, 10).map((c) => {
                          const existingInPO = items.find(
                            (it) => !it.isNew && it.consumableId === c.id
                          );

                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleQuickAddConsumable(c)}
                              title={existingInPO ? "Click to unselect and erase inputs" : "Click to add to PO"}
                              className={cn(
                                "p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 group relative hover:shadow-xs min-h-16",
                                existingInPO
                                  ? "border-accent/60 bg-accent/5 ring-1 ring-accent/30 hover:border-rose-400 hover:ring-rose-300"
                                  : "border-border bg-bg hover:border-accent/40 hover:bg-card"
                              )}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-mono text-[8px] font-semibold text-text-secondary truncate">
                                  {c.itemCode}
                                </span>
                                {existingInPO ? (
                                  <span className="px-1 py-0.2 rounded-full text-[8px] font-bold bg-accent text-accent-foreground shrink-0 flex items-center gap-0.5 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                    <Check className="h-2 w-2 group-hover:hidden" />
                                    <X className="h-2 w-2 hidden group-hover:inline" />
                                    <span className="group-hover:hidden">Added</span>
                                    <span className="hidden group-hover:inline">Unselect</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-accent font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                    <Plus className="h-2.5 w-2.5" />
                                    <span>Add</span>
                                  </span>
                                )}
                              </div>

                              <span className="font-bold text-[11px] text-text line-clamp-1 leading-tight">
                                {c.name}
                              </span>

                              <div className="flex items-center justify-between text-[9px] text-text-secondary pt-0.5 border-t border-border/40">
                                <span className="truncate max-w-16">{c.category}</span>
                                <span className="font-medium text-text shrink-0">
                                  {c.currentQty} {c.unit}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-3 text-center text-text-secondary space-y-1">
                        <p className="font-medium text-xs">No matching consumable stock found</p>
                        <p className="text-[10px]">
                          Try adjusting your search query or click{" "}
                          <button
                            type="button"
                            onClick={() => handleAddItem(true)}
                            className="text-accent underline font-semibold cursor-pointer"
                          >
                            + Custom Consumable
                          </button>
                        </p>
                      </div>
                    )
                  ) : filteredAssetCatalog.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-1">
                      {filteredAssetCatalog.slice(0, 10).map((a) => {
                        const existingInPO = items.find(
                          (it) => !it.isNew && it.assetId === a.id
                        );

                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => handleQuickAddAsset(a)}
                            title={existingInPO ? "Click to unselect and erase inputs" : "Click to add to PO"}
                            className={cn(
                              "p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 group relative hover:shadow-xs min-h-16",
                              existingInPO
                                ? "border-accent/60 bg-accent/5 ring-1 ring-accent/30 hover:border-rose-400 hover:ring-rose-300"
                                : "border-border bg-bg hover:border-accent/40 hover:bg-card"
                            )}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-mono text-[8px] font-semibold text-text-secondary truncate">
                                {a.assetCode}
                              </span>
                              {existingInPO ? (
                                <span className="px-1 py-0.2 rounded-full text-[8px] font-bold bg-accent text-accent-foreground shrink-0 flex items-center gap-0.5 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                  <Check className="h-2 w-2 group-hover:hidden" />
                                  <X className="h-2 w-2 hidden group-hover:inline" />
                                  <span className="group-hover:hidden">Added</span>
                                  <span className="hidden group-hover:inline">Unselect</span>
                                </span>
                              ) : (
                                <span className="text-[9px] text-accent font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                  <Plus className="h-2.5 w-2.5" />
                                  <span>Add</span>
                                </span>
                              )}
                            </div>

                            <span className="font-bold text-[11px] text-text line-clamp-1 leading-tight">
                              {a.name}
                            </span>

                            <div className="flex items-center justify-between text-[9px] text-text-secondary pt-0.5 border-t border-border/40">
                              <span className="truncate max-w-16">{a.category}</span>
                              <span className="font-medium text-text shrink-0">
                                {a.value ? formatPhp(a.value) : "Asset"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-text-secondary space-y-1">
                      <p className="font-medium text-xs">No matching assets found</p>
                      <p className="text-[10px]">
                        Try adjusting your search query or click{" "}
                        <button
                          type="button"
                          onClick={() => handleAddItem(true)}
                          className="text-accent underline font-semibold cursor-pointer"
                        >
                          + Custom Asset
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Section: Configured Line Items List */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Boxes className="h-3.5 w-3.5 text-accent" />
                      Configured PO Line Items ({items.length})
                    </span>
                  </div>
                  <div className="font-mono text-xs font-bold text-text">
                    Running Total: <span className="text-status-active-text">{formatPhp(totalEstimatedAmount)}</span>
                  </div>
                </div>

                {items.map((item, idx) => {
                  const lineTotal =
                    parseUnsignedInt(item.quantity, 0) *
                    (parseMoney(item.unitCost) ?? 0);

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs relative group"
                    >
                      {/* Top Mode Row */}
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-accent/15 text-accent font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>

                          {/* Simple Existing vs New Toggle */}
                          <div className="flex items-center bg-bg-subtle p-0.5 rounded-lg border border-border text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleToggleItemNew(item.id, false)}
                              className={cn(
                                "px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer",
                                !item.isNew
                                  ? "bg-bg text-text shadow-2xs font-bold"
                                  : "text-text-secondary hover:text-text"
                              )}
                            >
                              Existing {poType === "asset" ? "Asset Record" : "Consumable Stock"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleItemNew(item.id, true)}
                              className={cn(
                                "px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer",
                                item.isNew
                                  ? poType === "asset"
                                    ? "bg-bg text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                                    : "bg-bg text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                                  : "text-text-secondary hover:text-text"
                              )}
                            >
                              + New {poType === "asset" ? "Asset Item" : "Consumable Item"}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-text">
                            Total: <span className="text-status-active-text">{formatPhp(lineTotal)}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={items.length <= 1 && !item.name && !item.consumableId && !item.assetId}
                            title={items.length <= 1 ? "Clear Line Item" : "Remove Line Item"}
                            className="p-1 rounded-md text-text-secondary hover:text-status-outofservice-text hover:bg-status-outofservice-bg/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Line Item Inputs Grid */}
                      <div className="space-y-3">
                        {/* Row 1: Item Name & Supplier */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Item Name / Selector */}
                          <div className="space-y-1">
                            <label className="font-semibold text-text">
                              {item.isNew
                                ? poType === "asset"
                                  ? "New Asset Item Name"
                                  : "New Consumable Item Name"
                                : poType === "asset"
                                ? "Selected Catalog Asset"
                                : "Selected Consumable Stock"}
                            </label>
                            {!item.isNew ? (
                              item.name ? (
                                <div className="w-full h-8.5 px-3 rounded-lg border border-border bg-bg flex items-center justify-between text-xs select-none">
                                  <span className="font-bold text-text truncate">
                                    {item.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent/15 text-accent border border-accent/25">
                                      Catalog Stock
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleClearCatalogItem(item.id)}
                                      title="Unselect and erase inputs"
                                      className="p-1 rounded text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  readOnly
                                  placeholder="Select an item from the catalog above..."
                                  className="w-full h-8.5 px-3 rounded-lg border border-border bg-bg text-text-secondary text-xs select-none cursor-default"
                                />
                              )
                            ) : (
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  handleItemFieldChange(item.id, "name", e.target.value)
                                }
                                placeholder={
                                  poType === "asset"
                                    ? "e.g. Epson EB-X51 LCD Projector"
                                    : "e.g. Hard Copy Multi-Purpose Paper A4 80gsm"
                                }
                                required
                                className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-bg text-text text-xs focus:ring-1 focus:ring-ring focus:outline-hidden font-medium"
                              />
                            )}
                          </div>

                          {/* Specific Supplier / Vendor per item */}
                          <div className="space-y-1">
                            <label className="font-semibold text-text flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5 text-text-secondary" />
                              <span>Supplier / Vendor</span>
                            </label>
                            <select
                              value={item.supplierId || item.suggestedDealer || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                const matched = suppliers.find((s) => s.id === val || s.name === val);
                                handleItemFieldChange(item.id, "supplierId", matched?.id || "");
                                handleItemFieldChange(item.id, "suggestedDealer", matched?.name || val);
                              }}
                              className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-bg text-text text-xs focus:ring-1 focus:ring-ring focus:outline-hidden cursor-pointer"
                            >
                              <option value="">-- Direct / Default Supplier --</option>
                              {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.supplierCode})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "grid grid-cols-2 gap-3 pt-1 border-t border-border/40",
                            poType === "consumable" && item.isNew
                              ? "sm:grid-cols-3 lg:grid-cols-5"
                              : "sm:grid-cols-4"
                          )}
                        >
                          {/* 1. Quantity */}
                          <div className="space-y-1">
                            <label className="font-semibold text-text">Quantity</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemFieldChange(item.id, "quantity", e.target.value)
                                }
                                required
                                placeholder="1"
                                className="w-full h-8.5 px-2 text-center font-bold font-mono rounded-lg border border-border bg-bg text-text focus:ring-1 focus:ring-ring focus:outline-hidden"
                              />
                              <span className="text-[11px] text-text-secondary font-medium shrink-0">
                                {item.unit}
                              </span>
                            </div>
                          </div>

                          {/* 2. Unit Cost */}
                          <div className="space-y-1">
                            <label className="font-semibold text-text">Unit Cost (₱)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.unitCost}
                              onChange={(e) =>
                                handleItemFieldChange(item.id, "unitCost", e.target.value)
                              }
                              placeholder="0.00"
                              required
                              className="w-full h-8.5 px-2 text-right font-mono font-bold rounded-lg border border-border bg-bg text-text focus:ring-1 focus:ring-ring focus:outline-hidden"
                            />
                          </div>

                          {/* 3. Classification (new consumable) / Category */}
                          {poType === "consumable" && item.isNew && (
                            <div className="space-y-1">
                              <label className="font-semibold text-text">
                                Classification
                              </label>
                              <select
                                value={item.classification}
                                onChange={(e) =>
                                  handleItemFieldChange(
                                    item.id,
                                    "classification",
                                    e.target.value
                                  )
                                }
                                className="w-full h-8.5 px-2 rounded-lg border border-border bg-bg text-text text-xs focus:ring-1 focus:ring-accent focus:outline-hidden cursor-pointer"
                              >
                                {CONSUMABLE_CLASSIFICATIONS.map((id) => (
                                  <option key={id} value={id}>
                                    {CONSUMABLE_CLASSIFICATION_LABELS[id]}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="font-semibold text-text">Category</label>
                            {item.isNew ? (
                              <select
                                value={item.category}
                                onChange={(e) =>
                                  handleItemFieldChange(item.id, "category", e.target.value)
                                }
                                className="w-full h-8.5 px-2 rounded-lg border border-border bg-bg text-text text-xs focus:ring-1 focus:ring-accent focus:outline-hidden cursor-pointer"
                              >
                                {(poType === "asset" ? assetCategories : consumableCategories).map((c) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={
                                  poType === "consumable"
                                    ? `${CONSUMABLE_CLASSIFICATION_LABELS[item.classification] || "Consumable Supplies"} · ${item.category || "General Supply"}`
                                    : item.category || "Equipment"
                                }
                                readOnly
                                className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-bg-subtle/60 text-text-secondary text-xs focus:outline-hidden select-none cursor-default"
                              />
                            )}
                          </div>

                          {/* 4. Unit of Measure / Assignment Type */}
                          <div className="space-y-1">
                            <label className="font-semibold text-text">
                              {poType === "consumable" ? "Unit of Measure" : "Assignment Type"}
                            </label>
                            {item.isNew ? (
                              poType === "consumable" ? (
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) =>
                                    handleItemFieldChange(item.id, "unit", e.target.value)
                                  }
                                  placeholder="pcs, reams..."
                                  className="w-full h-8.5 px-2 rounded-lg border border-border bg-bg text-text text-xs focus:ring-1 focus:ring-accent focus:outline-hidden"
                                />
                              ) : (
                                <select
                                  value={item.assignmentType}
                                  onChange={(e) =>
                                    handleItemFieldChange(item.id, "assignmentType", e.target.value)
                                  }
                                  className="w-full h-8.5 px-2 rounded-lg border border-border bg-bg text-text text-xs focus:ring-1 focus:ring-accent focus:outline-hidden cursor-pointer"
                                >
                                  <option value="borrowable">Borrowable</option>
                                  <option value="assignable">Assignable</option>
                                </select>
                              )
                            ) : (
                              <input
                                type="text"
                                value={
                                  poType === "consumable"
                                    ? item.unit || "pcs"
                                    : item.assignmentType === "assignable"
                                    ? "Assignable"
                                    : "Borrowable"
                                }
                                readOnly
                                className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-bg-subtle/60 text-text-secondary text-xs focus:outline-hidden select-none cursor-default"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= STEP 3: FINAL REVIEW ================= */}
          {currentStep === "review" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Review Master PO Details Card */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-accent" />
                    <h3 className="font-bold text-xs text-text uppercase tracking-wider">
                      Purchase Order Header Details
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep("details")}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit Details
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-text-secondary font-medium block">P.O. Number</span>
                    <span className="font-mono font-bold text-text">
                      {poNumberMode === "manual" && customPoNumber.trim() ? (
                        <span className="text-accent">{customPoNumber.trim()}</span>
                      ) : (
                        <span className="text-text-secondary italic">Auto-generated on filing</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary font-medium block">Order Classification</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5",
                        poType === "asset"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      )}
                    >
                      {poType === "asset" ? "Fixed Assets & Equipment" : "Consumable Supplies"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary font-medium block">Order Date</span>
                    <span className="font-bold text-text">{poDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary font-medium block">Requested By</span>
                    <span className="font-bold text-text">{accountRequesterName}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
                  <div>
                    <span className="text-[10px] text-text-secondary font-medium block">Target Department</span>
                    <span className="font-bold text-text">
                      {departments.find((d) => d.id === targetDepartmentId)?.name || "—"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-text-secondary font-medium block">Procurement Purpose</span>
                      <p className="text-text font-medium leading-relaxed mt-0.5">{generalPurpose}</p>
                    </div>
                    {generalNotes && (
                      <div>
                        <span className="text-[10px] text-text-secondary font-medium block">Order Notes & Justification</span>
                        <p className="text-text-secondary leading-relaxed mt-0.5">{generalNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Review Line Items Table Card */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-accent" />
                    <h3 className="font-bold text-xs text-text uppercase tracking-wider">
                      Line Items Breakdown ({items.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep("items")}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit Items
                  </button>
                </div>

                <div className="border border-border overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-bg-subtle text-text-secondary border-b border-border font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Item Description</th>
                        <th className="px-3 py-2">Supplier / Vendor</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Cost</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item) => {
                        const qty = parseUnsignedInt(item.quantity, 0);
                        const unitCost = parseMoney(item.unitCost) ?? 0;
                        const subtotal = qty * unitCost;

                        return (
                          <tr key={item.id} className="hover:bg-bg-subtle/40">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-text block">{item.name}</span>
                                {item.isNew && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-accent/15 text-accent border border-accent/25">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-text-secondary">
                                {item.category || "General Supply"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-text-secondary font-medium">
                              {item.suggestedDealer || "—"}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                  poType === "asset"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                )}
                              >
                                {poType === "asset" ? "Asset" : "Consumable"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-text">
                              {qty} {item.unit}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-text">
                              ₱{unitCost.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-status-active-text">
                              ₱{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total & Signatory Authorization Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Authorized Approver</span>
                  </div>
                  <p className="font-bold text-text text-sm">JACINTO ANTONIO R. LEPITEN JR.</p>
                  <p className="text-[10px] text-text-secondary">
                    Head Property Custodian · Cebu Roosevelt Memorial Colleges
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card space-y-1 text-right flex flex-col justify-center shadow-2xs">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Total Estimated PO Value
                  </span>
                  <span className="text-xl font-mono font-bold text-status-active-text">
                    {formatPhp(totalEstimatedAmount)}
                  </span>
                </div>
              </div>

              {/* Receipt Upload Information Notice */}
              <div className="p-4 rounded-xl border border-border bg-card/60 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-accent" />
                    <h3 className="font-bold text-xs text-text uppercase tracking-wider">
                      Official Vendor Receipt Upload
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/25">
                    Disabled Until Approved
                  </span>
                </div>

                <div className="flex items-start gap-2.5 pt-0.5">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Proof of purchase documents (scanned official receipts, delivery receipts, or sales invoices) can only be attached after this Purchase Order is reviewed and approved by the Property Custodian.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls (Step Transitions & Submission) */}
        <div className="p-4 border-t border-border bg-bg-subtle flex items-center justify-between gap-3 shrink-0">
          <div>
            {currentStep !== "details" ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === "review") setCurrentStep("items");
                  else if (currentStep === "items") setCurrentStep("details");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-bg text-text transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSafeClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-bg text-text transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep === "details" && (
              <button
                type="button"
                onClick={handleNextFromDetails}
                className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <span>Continue to Line Items</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {currentStep === "items" && (
              <button
                type="button"
                onClick={handleNextFromItems}
                className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <span>Review Order Details</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {currentStep === "review" && (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Filing Purchase Order...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & File Purchase Order</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
