"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Edit,
  PackagePlus,
} from "lucide-react";
import Link from "next/link";

import type {
  Asset,
  AssetCategory,
  AssetStatus,
  AssetAssignmentType,
} from "@/types/assets";
import { useCategoriesQuery } from "@/features/categories/client/use-categories";
import { useSuppliersQuery } from "@/features/suppliers/client";
import { assetsApi } from "@/features/assets/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { QRCodeDisplay } from "./qr-code-display";
import { AssetDialogShell } from "./asset-dialog-shell";

const STATUS_OPTIONS: Array<{ value: AssetStatus; label: string }> = [
  { value: "active", label: "Active (Serviceable)" },
  { value: "needs_repair", label: "Needs Repair" },
  { value: "out_of_service", label: "Out of Service" },
  { value: "retired", label: "Retired" },
  { value: "missing", label: "Missing" },
];

const ASSIGNMENT_OPTIONS: Array<{
  value: AssetAssignmentType;
  title: string;
  description: string;
}> = [
  {
    value: "borrowable",
    title: "Borrowable",
    description: "Can be borrowed out. Due date is collected when it is issued.",
  },
  {
    value: "assignable",
    title: "Assignable",
    description: "Issued to a project. The holder is named at issue time.",
  },
  {
    value: "fixed",
    title: "Fixed",
    description:
      "Stays on site (buildings, gym, warehouse). Cannot be borrowed or assigned.",
  },
];

const STEPS = [
  { label: "Details", description: "Identity and how it is used" },
  { label: "Record", description: "Code, cost and notes" },
  { label: "Review", description: "Confirm and QR" },
] as const;
const STEP_FOCUS = ["#asset-name", "#serial-input", "#asset-review"] as const;

const FIELD_CLASS =
  "w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:opacity-50";

const ERROR_ID = "asset-form-error";

export interface AddEditAssetDialogProps {
  isOpen: boolean;
  initialAsset?: Asset | null;
  onClose: () => void;
  onSave: (assetData: Partial<Asset>) => Promise<void> | void;
}

interface AddEditAssetDialogFormProps {
  initialAsset?: Asset | null;
  onClose: () => void;
  onSave: (assetData: Partial<Asset>) => Promise<void> | void;
}

function RequiredMark() {
  return (
    <span className="text-rose-600" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

function ReviewLine({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  const shown = value.trim() ? value : "—";
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </dt>
      <dd className="truncate text-xs font-medium text-text" title={shown}>
        {shown}
      </dd>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-3.5 shadow-2xs">
      <h3 className="border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wider text-text">
        {title}
      </h3>
      {children}
    </section>
  );
}

function AddEditAssetDialogForm({
  initialAsset,
  onClose,
  onSave,
}: AddEditAssetDialogFormProps) {
  const isEditing = Boolean(initialAsset);
  const { data: allCategories = [], isLoading: categoriesLoading } =
    useCategoriesQuery();
  const { data: suppliers = [], isLoading: suppliersLoading } =
    useSuppliersQuery({ activeOnly: true });
  const assetClasses = useMemo(
    () => allCategories.filter((c) => c.type === "asset_class"),
    [allCategories]
  );

  const assetCategories = useMemo(() => {
    const fromSettings = allCategories.filter((c) => c.type === "asset");
    const current = initialAsset?.category?.trim();
    if (
      current &&
      !fromSettings.some(
        (c) => c.name.toLowerCase() === current.toLowerCase()
      )
    ) {
      return [
        {
          id: `legacy-${current}`,
          name: current,
          type: "asset" as const,
          parentName: null,
        },
        ...fromSettings,
      ];
    }
    return fromSettings;
  }, [allCategories, initialAsset?.category]);

  const classOptions = useMemo(
    () =>
      assetClasses
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.name, label: c.name })),
    [assetClasses]
  );

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: s.supplierCode ? `${s.name} (${s.supplierCode})` : s.name,
        keywords: s.supplierCode ?? "",
      })),
    [suppliers]
  );

  const [name, setName] = useState(() => initialAsset?.name ?? "");
  const [category, setCategory] = useState(
    () => initialAsset?.category ?? ""
  );
  const [classification, setClassification] = useState(
    () => initialAsset?.classification ?? ""
  );
  const [categoryCleared, setCategoryCleared] = useState(false);

  const parentNameForCategory = (categoryName: string) => {
    const match = assetCategories.find(
      (c) => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
    );
    return match?.parentName?.trim() || "";
  };

  const categoryOptions = useMemo(() => {
    const selectedClass = classification.trim().toLowerCase();
    const currentCategory = category.trim().toLowerCase();
    return assetCategories
      .filter((c) => {
        if (c.name.trim().toLowerCase() === currentCategory) return true;
        if (!selectedClass) return true;
        const parent = c.parentName?.trim().toLowerCase() || "";
        return !parent || parent === selectedClass;
      })
      .map((c) => ({
        value: c.name,
        label: c.parentName ? `${c.name} (${c.parentName})` : c.name,
      }));
  }, [assetCategories, category, classification]);
  const [unit, setUnit] = useState(
    () => initialAsset?.unit?.trim() || "unit"
  );
  const [status, setStatus] = useState<AssetStatus | "">(
    () => initialAsset?.status ?? "active"
  );
  const [assignmentType, setAssignmentType] = useState<AssetAssignmentType>(
    () => initialAsset?.assignmentType ?? "borrowable"
  );
  const [assetCode, setAssetCode] = useState(
    () => initialAsset?.assetCode ?? ""
  );
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [codeAttempt, setCodeAttempt] = useState(0);
  const [serialNumber, setSerialNumber] = useState(
    () => initialAsset?.serialNumber ?? ""
  );
  const [location, setLocation] = useState(
    () => initialAsset?.location ?? ""
  );
  const [department] = useState(() => initialAsset?.department ?? "");
  const [notes, setNotes] = useState(() => initialAsset?.notes ?? "");
  const [value, setValue] = useState(() =>
    initialAsset?.value != null ? String(initialAsset.value) : ""
  );
  const [purchaseDate, setPurchaseDate] = useState(
    () => initialAsset?.purchaseDate ?? ""
  );
  const [supplierId, setSupplierId] = useState(
    () => initialAsset?.supplierId ?? ""
  );
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  const classRequired = assetClasses.length > 0;
  const noCategories = !categoriesLoading && assetCategories.length === 0;

  useEffect(() => {
    if (isEditing || !category) return;
    let cancelled = false;
    setCodeLoading(true);
    setCodeError("");
    void assetsApi
      .peekNextAssetCode(category)
      .then((result) => {
        if (cancelled) return;
        if (!result?.assetCode) {
          setAssetCode("");
          setCodeError("No asset code was returned.");
          return;
        }
        setAssetCode(result.assetCode);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAssetCode("");
        setCodeError(
          err instanceof Error ? err.message : "Could not reserve an asset code."
        );
      })
      .finally(() => {
        if (!cancelled) setCodeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, isEditing, codeAttempt]);

  useEffect(() => {
    if (step !== 2 || isEditing || !category || assetCode) return;
    setCodeAttempt((attempt) => attempt + 1);
  }, [step, isEditing, category, assetCode]);

  useEffect(() => {
    if (classification.trim() || !category) return;
    const match = assetCategories.find(
      (c) => c.name.trim().toLowerCase() === category.trim().toLowerCase()
    );
    const parent = match?.parentName?.trim() || "";
    if (parent) setClassification(parent);
  }, [assetCategories, category, classification]);

  const clearInvalid = (field: string) => {
    if (invalidField === field) setInvalidField(null);
  };

  const handleCategoryChange = (next: string) => {
    setCategory(next);
    setCategoryCleared(false);
    clearInvalid("category-input");
    const parent = parentNameForCategory(next);
    if (parent) setClassification(parent);
    if (!isEditing) setAssetCode("");
  };

  const handleClassChange = (next: string) => {
    setClassification(next);
    clearInvalid("class-input");
    const parent = parentNameForCategory(category);
    if (
      category &&
      parent &&
      parent.toLowerCase() !== next.trim().toLowerCase()
    ) {
      setCategory("");
      setCategoryCleared(true);
      if (!isEditing) setAssetCode("");
    } else {
      setCategoryCleared(false);
    }
  };

  const fail = (field: string, message: string) => {
    setError(message);
    setInvalidField(field);
    requestAnimationFrame(() => {
      document.getElementById(field)?.focus();
    });
  };

  const invalidFor = (index: number) => {
    if (index === 0) {
      if (!name.trim()) {
        fail("asset-name", "Please enter the asset name.");
        return true;
      }
      if (classRequired && !classification.trim()) {
        fail("class-input", "Please select an asset class.");
        return true;
      }
      if (!category) {
        fail(
          "category-input",
          assetCategories.length === 0
            ? "No asset categories yet. Add them under Settings → Categories."
            : "Please enter an asset category."
        );
        return true;
      }
      if (!status) {
        fail("status-input", "Please select an initial condition.");
        return true;
      }
      if (!location.trim()) {
        fail("location-input", "Please enter the asset location.");
        return true;
      }
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      if (invalidFor(step)) return;
      setError("");
      setInvalidField(null);
      setStep(step + 1);
      return;
    }
    if (invalidFor(0)) {
      setStep(0);
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setInvalidField(null);
      let code = assetCode.trim().toUpperCase();
      if (!isEditing) {
        try {
          const fresh = await assetsApi.peekNextAssetCode(category);
          code = fresh.assetCode;
          setAssetCode(fresh.assetCode);
        } catch {
          // Fall through — server will allocate if code is missing/stale.
        }
      }

      await onSave({
        id: initialAsset?.id,
        ...(isEditing
          ? { assetCode: code }
          : code
            ? { assetCode: code }
            : {}),
        name: name.trim(),
        category: category as AssetCategory,
        classification: classification.trim(),
        unit: unit.trim() || "unit",
        status: status as AssetStatus,
        assignmentType,
        serialNumber: serialNumber.trim() || undefined,
        location: location.trim(),
        department: department.trim() || undefined,
        notes: notes.trim() || undefined,
        value: value.trim() !== "" ? Number(value) : undefined,
        purchaseDate: purchaseDate || undefined,
        supplierId: supplierId || null,
        lastUpdated: new Date().toISOString().split("T")[0],
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while saving. Please try again."
      );
      setInvalidField(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const describedBy = (field: string, hintId?: string) => {
    const ids = [
      hintId,
      invalidField === field ? ERROR_ID : null,
    ].filter(Boolean);
    return ids.length > 0 ? ids.join(" ") : undefined;
  };

  const invalidClass = (field: string) =>
    invalidField === field ? "border-status-outofservice-bg" : undefined;

  const repairHintId = status === "needs_repair" ? "repair-callout" : undefined;
  const assignmentLabel =
    ASSIGNMENT_OPTIONS.find((option) => option.value === assignmentType)?.title ??
    assignmentType;
  const statusLabel =
    STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "";
  const supplierLabel =
    supplierOptions.find((option) => option.value === supplierId)?.label ?? "";

  return (
    <AssetDialogShell
      layout="wizard"
      title={isEditing ? "Edit Asset Record" : "Register New Asset"}
      subtitle={
        <>
          {STEPS[step].label}
          <span className="text-text-secondary/80">
            {" "}
            — {STEPS[step].description}
          </span>
        </>
      }
      icon={
        isEditing ? (
          <Edit className="h-4 w-4" />
        ) : (
          <PackagePlus className="h-4 w-4" />
        )
      }
      headerExtra={
        <div className="flex min-w-0 items-stretch gap-2 px-4 pb-2.5 sm:px-5">
          {STEPS.map((item, index) => {
            const current = index === step;
            const passed = index < step;
            return (
              <button
                key={item.label}
                type="button"
                aria-current={current ? "step" : undefined}
                title={`${item.label} — ${item.description}`}
                disabled={index > step || isSubmitting}
                onClick={() => {
                  if (index >= step) return;
                  setError("");
                  setInvalidField(null);
                  setStep(index);
                }}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left",
                  index <= step ? "cursor-pointer" : "cursor-default",
                  current
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-bg hover:bg-bg-subtle disabled:hover:bg-bg"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    current || passed
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-bg text-text-secondary"
                  )}
                >
                  {passed ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-text">
                    {item.label}
                  </span>
                  <span className="block truncate text-[10px] text-text-secondary">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      }
      onClose={onClose}
      busy={isSubmitting}
      initialFocusSelector={STEP_FOCUS[step]}
      formProps={{ onSubmit: (e) => void handleSubmit(e) }}
      alert={
        error ? (
          <div
            id={ERROR_ID}
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-status-outofservice-bg/30 bg-status-outofservice-bg/10 p-3 text-xs font-medium text-status-outofservice-text"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : noCategories ? (
          <p
            role="alert"
            className="rounded-xl border border-status-outofservice-bg/30 bg-status-outofservice-bg/10 px-3 py-2 text-xs text-status-outofservice-text"
          >
            No asset categories yet. Add them in{" "}
            <Link
              href="/categories"
              className="font-semibold underline-offset-2 hover:underline"
            >
              Category Management
            </Link>{" "}
            before registering an asset.
          </p>
        ) : null
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setInvalidField(null);
                setStep(step - 1);
              }}
              disabled={isSubmitting}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-text transition-colors hover:bg-bg disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-bg disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || assetCategories.length === 0}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              "Saving…"
            ) : step < STEPS.length - 1 ? (
              <>
                Continue to {STEPS[step + 1].label}
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {isEditing ? "Save changes" : "Register asset"}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs">
        {step === 0 ? (
        <>
        <FormSection title="Identity">
          <div className="space-y-1">
            <label
              htmlFor="asset-name"
              className="block text-xs font-semibold text-text"
            >
              Asset Name
              <RequiredMark />
            </label>
            <input
              id="asset-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearInvalid("asset-name");
              }}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={invalidField === "asset-name" || undefined}
              aria-describedby={describedBy("asset-name")}
              className={cn(FIELD_CLASS, invalidClass("asset-name"))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="class-input"
                className="block text-xs font-semibold text-text"
              >
                Asset Class
                {classRequired ? <RequiredMark /> : null}
              </label>
              <SearchableSelect
                id="class-input"
                value={classification}
                onValueChange={handleClassChange}
                options={classOptions}
                disabled={isSubmitting || categoriesLoading}
                aria-required={classRequired}
                aria-invalid={invalidField === "class-input" || undefined}
                aria-describedby={describedBy("class-input", "class-hint")}
                placeholder={
                  categoriesLoading
                    ? "Loading…"
                    : assetClasses.length === 0
                      ? "No classes — add in Categories"
                      : "Type to find a class…"
                }
                emptyMessage="No classes match"
                inputClassName="focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="category-input"
                className="block text-xs font-semibold text-text"
              >
                Asset Category
                <RequiredMark />
              </label>
              <SearchableSelect
                id="category-input"
                value={category}
                onValueChange={handleCategoryChange}
                options={categoryOptions}
                disabled={isSubmitting || categoriesLoading}
                aria-required
                aria-invalid={invalidField === "category-input" || undefined}
                aria-describedby={describedBy("category-input", "class-hint")}
                placeholder={
                  categoriesLoading
                    ? "Loading…"
                    : assetCategories.length === 0
                      ? "No categories — add in Settings"
                      : "Type to find a category…"
                }
                emptyMessage="No categories — add in Settings"
                inputClassName="focus:border-primary focus:ring-primary/20"
              />
            </div>
          </div>
          <p id="class-hint" className="text-[11px] text-text-secondary">
            {classRequired
              ? "Choosing a category sets the class from its parent. Choosing a class limits categories. Categories with no parent stay listed."
              : categoriesLoading
                ? "Loading classes…"
                : "This institution has no classes, so class is optional."}
          </p>
          {categoryCleared ? (
            <p className="text-[11px] text-text-secondary">
              Category cleared because it belongs to another class.
            </p>
          ) : null}
        </FormSection>
        <FormSection title="Use">
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-text">
              Assignment type
              <RequiredMark />
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ASSIGNMENT_OPTIONS.map((option) => {
                const selected = assignmentType === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex min-h-16 cursor-pointer items-start gap-2 rounded-xl border p-3 text-left transition-all",
                      selected
                        ? "border-primary/60 bg-primary/10 shadow-xs ring-2 ring-primary/20"
                        : "border-border bg-card hover:border-border hover:bg-bg-subtle/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="assignmentType"
                      value={option.value}
                      checked={selected}
                      aria-label={option.title}
                      onChange={() => setAssignmentType(option.value)}
                      disabled={isSubmitting}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-xs font-semibold text-text">
                        {option.title}
                      </span>
                      <span
                        className="block text-[11px] leading-snug text-text-secondary"
                        aria-hidden="true"
                      >
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="status-input"
                className="block text-xs font-semibold text-text"
              >
                Condition
                <RequiredMark />
              </label>
              <select
                id="status-input"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as AssetStatus | "");
                  clearInvalid("status-input");
                }}
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={invalidField === "status-input" || undefined}
                aria-describedby={describedBy("status-input", repairHintId)}
                className={cn(FIELD_CLASS, invalidClass("status-input"))}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {status === "needs_repair" ? (
                <p
                  id="repair-callout"
                  className="text-[11px] leading-relaxed text-text-secondary"
                >
                  {initialAsset?.currentHolder
                    ? `Opens a Maintenance Logs entry and keeps custody with ${initialAsset.currentHolder}.`
                    : "This opens a Maintenance Logs entry so the asset can be marked serviceable again after repair."}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="unit-input"
                className="block text-xs font-semibold text-text"
              >
                Unit of Measure
              </label>
              <input
                id="unit-input"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={isSubmitting}
                placeholder="unit, set, pair, pcs…"
                aria-describedby="unit-hint"
                className={FIELD_CLASS}
              />
              <p id="unit-hint" className="text-[11px] text-text-secondary">
                How this asset is counted on POs and records.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="location-input"
              className="block text-xs font-semibold text-text"
            >
              Location
              <RequiredMark />
            </label>
            <input
              id="location-input"
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                clearInvalid("location-input");
              }}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={invalidField === "location-input" || undefined}
              aria-describedby={describedBy("location-input")}
              className={cn(FIELD_CLASS, invalidClass("location-input"))}
            />
          </div>
        </FormSection>
        </>
        ) : null}

        {step === 1 ? (
        <>
        <FormSection title="Identification">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="serial-input"
                className="block text-xs font-semibold text-text"
              >
                Serial Number
              </label>
              <input
                id="serial-input"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                disabled={isSubmitting}
                className={cn(FIELD_CLASS, "font-mono")}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="asset-code"
                  className="block text-xs font-semibold text-text"
                >
                  Asset Code
                </label>
                <span className="text-[10px] font-medium text-text-secondary">
                  {isEditing
                    ? "Fixed identifier"
                    : codeLoading
                      ? "Reserving…"
                      : assetCode
                        ? "Next available"
                        : "Waiting for a category"}
                </span>
              </div>
              <input
                id="asset-code"
                type="text"
                value={assetCode}
                readOnly
                tabIndex={-1}
                disabled
                placeholder={
                  isEditing
                    ? ""
                    : codeLoading
                      ? "Reserving…"
                      : "Choose a category to reserve a code."
                }
                className="w-full h-9 cursor-not-allowed select-none rounded-lg border border-border bg-bg-subtle px-3 text-xs font-mono font-semibold text-text-secondary"
              />
            </div>
          </div>
        </FormSection>
        <FormSection title="Acquisition">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="purchase-date"
                className="block text-xs font-semibold text-text"
              >
                Purchase Date
              </label>
              <input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                disabled={isSubmitting}
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="value-input"
                className="block text-xs font-semibold text-text"
              >
                Value (₱)
              </label>
              <input
                id="value-input"
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isSubmitting}
                className={cn(FIELD_CLASS, "font-mono")}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="supplier-input"
              className="block text-xs font-semibold text-text"
            >
              Supplier
            </label>
            <SearchableSelect
              id="supplier-input"
              value={supplierId}
              onValueChange={setSupplierId}
              options={supplierOptions}
              disabled={isSubmitting || suppliersLoading}
              aria-describedby="supplier-hint"
              placeholder={
                suppliersLoading ? "Loading…" : "Type to find a supplier…"
              }
              clearLabel="None / unspecified"
              emptyMessage="No active suppliers"
              inputClassName="focus:border-primary focus:ring-primary/20"
            />
            <p id="supplier-hint" className="text-[11px] text-text-secondary">
              {suppliers.length === 0 && !suppliersLoading ? (
                <>
                  No active suppliers.{" "}
                  <Link
                    href="/suppliers"
                    className="font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    Register a supplier
                  </Link>{" "}
                  to track who you bought this unit from. When value is set on
                  create, acquisition cost and supplier snap into a purchase lot.
                </>
              ) : (
                "Links to the Suppliers registry. With value set on create, a purchase lot is recorded for cost history."
              )}
            </p>
          </div>
        </FormSection>

        <FormSection title="Notes">
          <div className="space-y-1">
            <label
              htmlFor="notes-input"
              className="block text-xs font-semibold text-text"
            >
              Notes
              {status === "needs_repair" ? (
                <span className="font-normal text-text-secondary">
                  {" "}
                  — written on the maintenance log
                </span>
              ) : null}
            </label>
            <textarea
              id="notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              disabled={isSubmitting}
              className="w-full resize-none rounded-lg border border-border bg-bg p-2.5 text-xs leading-relaxed text-text focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          </div>
        </FormSection>
        </>
        ) : null}

        {step === 2 ? (
          <div
            id="asset-review"
            tabIndex={-1}
            className="grid items-start gap-3 outline-none sm:grid-cols-[12.5rem_1fr]"
          >
            <section className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-4 shadow-2xs">
              {assetCode ? (
                <QRCodeDisplay
                  assetCode={assetCode}
                  assetName={name.trim() || assetCode}
                  size={132}
                  className="w-full border-0 bg-transparent p-0 shadow-none"
                />
              ) : (
                <div className="space-y-2 text-center">
                  <p className="text-xs text-text-secondary">
                    {codeLoading
                      ? "Reserving a code…"
                      : codeError || "A code could not be reserved for this category."}
                  </p>
                  {!codeLoading && category ? (
                    <button
                      type="button"
                      onClick={() => setCodeAttempt((attempt) => attempt + 1)}
                      className="cursor-pointer rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text hover:bg-bg-subtle"
                    >
                      Try again
                    </button>
                  ) : null}
                </div>
              )}
            </section>
            <section className="rounded-xl border border-border bg-card px-3.5 py-3 shadow-2xs">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text">
                Summary
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <ReviewLine label="Name" value={name} />
                <ReviewLine label="Class" value={classification} />
                <ReviewLine label="Category" value={category} />
                <ReviewLine label="Assignment" value={assignmentLabel} />
                <ReviewLine label="Condition" value={statusLabel} />
                <ReviewLine label="Unit" value={unit} />
                <ReviewLine label="Location" value={location} />
                <ReviewLine label="Serial" value={serialNumber} />
                <ReviewLine label="Purchase date" value={purchaseDate} />
                <ReviewLine
                  label="Value"
                  value={value.trim() ? `₱${value}` : ""}
                />
                <ReviewLine label="Supplier" value={supplierLabel} />
                <ReviewLine label="Code" value={assetCode} />
                <ReviewLine label="Notes" value={notes} className="col-span-2" />
              </dl>
            </section>
          </div>
        ) : null}
      </div>
    </AssetDialogShell>
  );
}

export function AddEditAssetDialog({
  isOpen,
  initialAsset,
  onClose,
  onSave,
}: AddEditAssetDialogProps) {
  if (!isOpen) return null;
  return (
    <AddEditAssetDialogForm
      key={initialAsset?.id ?? "new"}
      initialAsset={initialAsset}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
