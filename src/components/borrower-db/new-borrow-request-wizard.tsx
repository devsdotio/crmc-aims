"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  X,
  Search,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Tag,
  AlertCircle,
  Check,
  CheckCircle2,
  Package,
  Briefcase,
  Clock,
  Layers,
  FileCheck2,
  FileText,
  StickyNote,
  User,
  Minus,
  Plus,
  Laptop,
  Video,
  Truck,
  Armchair,
  HeartPulse,
  Printer,
  FlaskConical,
  Wrench,
  Zap,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryStyle } from "@/constants/categories";
import type {
  BrowseItem,
  BrowseConsumableItem,
  WizardFormValues,
  WizardPurposeGroup,
  WizardRequestType,
  WizardTypeBundle,
  RequestWizardStep,
  PortalBorrowRequest,
} from "./types";
import { useCategoriesQuery } from "@/features/categories/client/use-categories";
import { useCreateBorrowRequestMutation } from "@/features/borrow-requests/client/use-borrow-requests";
import { useCreateConsumableRequestMutation } from "@/features/consumable-requests/client";
import { useConsumablesQuery } from "@/features/consumables/client/use-consumables";
import { availableQty } from "@/components/consumables/utils";
import { useMeQuery } from "@/features/users/client/use-users";
import type { MeProfile } from "@/features/users/client/users-api";
import { useDepartmentsQuery } from "@/features/departments/client/use-departments";
import {
  mapBorrowRequestToPortal,
  mapConsumableRequestToPortal,
} from "./map-portal-request";
import { LoadingState } from "@/components/providers/loading-context";
import { useToast } from "@/components/providers/toast-context";
import { formatQuantityWithUnit } from "@/lib/sanitize-display";
import { summarizePurposes } from "@/lib/request-purpose";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useRequestModalDismiss } from "@/hooks/use-request-modal-dismiss";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split("T")[0];
}

function nextWeek() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

function newPurposeGroup(): WizardPurposeGroup {
  return { id: crypto.randomUUID(), purpose: "", lines: [] };
}

function newTypeBundle(requestType: WizardRequestType): WizardTypeBundle {
  return {
    requestType,
    selectedItems: [],
    purposeGroups: [newPurposeGroup()],
  };
}

function emptyWizardValues(
  initialTypes: WizardRequestType[] = []
): WizardFormValues {
  return {
    typeBundles: initialTypes.map(newTypeBundle),
    dateFrom: today(),
    dateTo: nextWeek(),
    departmentId: null,
    department: "",
    notes: "",
    requestedByName: "",
    requesterMode: "account",
  };
}

function typeLabel(t: WizardRequestType): string {
  if (t === "borrowable") return "Borrow Equipment";
  if (t === "assignable") return "Assignment";
  return "Supplies Requisition";
}

function formatFriendlyErrorMessage(rawMessage?: string): string {
  if (!rawMessage) return "Failed to submit request. Please check your form and try again.";
  const lower = rawMessage.toLowerCase();

  if (lower.includes("invalid uuid") || lower.includes("uuid")) {
    return "An item or department reference is invalid. Please select your categories again.";
  }
  if (lower.includes("department") && (lower.includes("link") || lower.includes("not found"))) {
    return "Your account is not linked to a department. Please ask an administrator to assign your department.";
  }
  if (lower.includes("expectedreturndate") || (lower.includes("return date") && lower.includes("required"))) {
    return "Please specify an expected return date for this borrow request.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Connection error. Please verify your network and try again.";
  }
  if (lower.includes("invalid input") || lower.includes("invalid literal") || lower.includes("expected string")) {
    return "Some details were formatted incorrectly. Please review your request form.";
  }

  return rawMessage;
}

// ─── Step Indicators ─────────────────────────────────────────────────────────

const STEPS: { key: RequestWizardStep; label: string; stepNumber: number }[] = [
  { key: "type", label: "Request Type", stepNumber: 1 },
  { key: "select", label: "Select Category", stepNumber: 2 },
  { key: "details", label: "Request Details", stepNumber: 3 },
  { key: "review", label: "Review & Submit", stepNumber: 4 },
];

function MilestoneStepIndicator({
  current,
  selectedTypes,
  hideTypeStep = false,
}: {
  current: RequestWizardStep;
  selectedTypes: WizardRequestType[];
  hideTypeStep?: boolean;
}) {
  const steps = hideTypeStep
    ? STEPS.filter((s) => s.key !== "type").map((s, i) => ({
        ...s,
        stepNumber: i + 1,
      }))
    : STEPS;
  const currentIdx = Math.max(
    0,
    steps.findIndex((s) => s.key === current)
  );
  const hasConsumable = selectedTypes.includes("consumable");
  const hasAsset = selectedTypes.some(
    (t) => t === "borrowable" || t === "assignable"
  );
  const selectLabel =
    hasConsumable && hasAsset
      ? "Select Items"
      : hasConsumable
        ? "Select Supplies"
        : "Select Category";

  return (
    <nav aria-label="Request Progress" className="w-full">
      <ol className="flex items-center justify-between w-full">
        {steps.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isLast = idx === steps.length - 1;

          return (
            <li
              key={step.key}
              className={cn(
                "flex items-center",
                isLast ? "flex-none" : "flex-1"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200",
                    isDone
                      ? "bg-accent text-accent-foreground shadow-xs"
                      : isActive
                      ? "bg-accent text-accent-foreground ring-4 ring-accent/20 shadow-xs"
                      : "bg-bg-subtle border border-border text-text-secondary font-medium"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <span>{step.stepNumber}</span>
                  )}
                </div>

                <div className="hidden sm:block">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Step {step.stepNumber}
                  </p>
                  <p
                    className={cn(
                      "text-xs leading-none transition-colors",
                      isActive
                        ? "font-bold text-text"
                        : isDone
                        ? "font-semibold text-text"
                        : "font-medium text-text-secondary"
                    )}
                  >
                    {step.key === "select" ? selectLabel : step.label}
                  </p>
                </div>
              </div>

              {!isLast && (
                <div
                  className={cn(
                    "mx-3 flex-1 h-0.5 transition-all duration-300 rounded-full",
                    idx < currentIdx ? "bg-accent" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Step 0: Request Type (Grouped with Distinct Vibrant Colors) ─────────────

function StepType({
  value,
  onToggle,
}: {
  value: WizardRequestType[];
  onToggle: (type: WizardRequestType) => void;
}) {
  const borrowGroup = [
    {
      id: "borrowable",
      title: "Borrow Equipment",
      subtitle: "Short-term temporary loan",
      description: "Loan equipment (e.g. laptops, projectors, tools) with a scheduled return date.",
      icon: Clock,
      badge: "Return Required",
      color: "blue",
      theme: {
        iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        selectedCard: "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/30 shadow-xs",
        selectedTitle: "text-blue-600 dark:text-blue-400",
        selectedRadio: "border-blue-500 bg-blue-500 text-white",
        activeIcon: "bg-blue-600 text-white border-transparent",
      },
    },
    {
      id: "assignable",
      title: "Request Assignment",
      subtitle: "Long-term custody allocation",
      description: "Direct equipment allocation designated for personal or departmental custody.",
      icon: Briefcase,
      badge: "Custody Assignment",
      color: "indigo",
      theme: {
        iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        selectedCard: "border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/30 shadow-xs",
        selectedTitle: "text-indigo-600 dark:text-indigo-400",
        selectedRadio: "border-indigo-500 bg-indigo-500 text-white",
        activeIcon: "bg-indigo-600 text-white border-transparent",
      },
    },
  ] as const;

  const requisitionGroup = [
    {
      id: "consumable",
      title: "Supplies Requisition",
      subtitle: "Consumables & Office Supplies",
      description: "Request consumable office stationery, printing materials, toner, or inventory supplies.",
      icon: Layers,
      badge: "Requisition",
      color: "emerald",
      theme: {
        iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        selectedCard: "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30 shadow-xs",
        selectedTitle: "text-emerald-600 dark:text-emerald-400",
        selectedRadio: "border-emerald-500 bg-emerald-500 text-white",
        activeIcon: "bg-emerald-600 text-white border-transparent",
      },
    },
  ] as const;

  return (
    <div className="space-y-6">
      <p className="text-xs text-text-secondary px-1">
        Select one or more request types. Each type will have its own purpose and items.
      </p>
      {/* ── Group 1: Borrow Request ── */}
      <section aria-labelledby="group-borrow-title" className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Package className="h-3.5 w-3.5" />
            </div>
            <h3 id="group-borrow-title" className="text-sm font-bold text-text">
              Borrow Request
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-bg-subtle px-2 py-0.5 rounded-full border border-border">
            Asset Lending & Custody
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {borrowGroup.map((opt) => {
            const isSelected = value.includes(opt.id);
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onToggle(opt.id)}
                aria-pressed={isSelected}
                className={cn(
                  "flex flex-col justify-between p-4 rounded-xl border text-left transition-all duration-150 relative",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isSelected
                    ? opt.theme.selectedCard
                    : "border-border bg-card hover:bg-bg-subtle hover:border-text-secondary/30"
                )}
              >
                <div className="flex items-start justify-between gap-3 w-full">
                  <div
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center border transition-colors",
                      isSelected ? opt.theme.activeIcon : opt.theme.iconBg
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors border",
                      isSelected ? opt.theme.selectedRadio : "border-border bg-card"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-3 text-white" />}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-bold", isSelected ? opt.theme.selectedTitle : "text-text")}>
                      {opt.title}
                    </p>
                  </div>
                  <p className="text-[11px] font-medium text-text-secondary mt-0.5">
                    {opt.subtitle}
                  </p>
                  <p className="text-xs text-text-secondary/80 mt-1.5 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Group 2: Requisition ── */}
      <section aria-labelledby="group-req-title" className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileCheck2 className="h-3.5 w-3.5" />
            </div>
            <h3 id="group-req-title" className="text-sm font-bold text-text">
              Requisition
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-bg-subtle px-2 py-0.5 rounded-full border border-border">
            Supplies & Materials
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {requisitionGroup.map((opt) => {
            const isSelected = value.includes(opt.id);
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onToggle(opt.id)}
                aria-pressed={isSelected}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-150 relative",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isSelected
                    ? opt.theme.selectedCard
                    : "border-border bg-card hover:bg-bg-subtle hover:border-text-secondary/30"
                )}
              >
                <div
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center border transition-colors",
                    isSelected ? opt.theme.activeIcon : opt.theme.iconBg
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-bold", isSelected ? opt.theme.selectedTitle : "text-text")}>
                      {opt.title}
                    </p>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", opt.theme.badge)}>
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-text-secondary mt-0.5">
                    {opt.subtitle}
                  </p>
                  <p className="text-xs text-text-secondary/80 mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-1 transition-colors border",
                    isSelected ? opt.theme.selectedRadio : "border-border bg-card"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ─── Step 2: Select Asset Category (Color Coded Cards View) ──────────────────

interface AssetCategoryCardMeta {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  style: ReturnType<typeof getCategoryStyle>;
}

const ASSET_CATEGORIES: AssetCategoryCardMeta[] = [
  {
    id: "computing",
    title: "Computing & IT",
    subtitle: "Laptops & PCs",
    description: "Workstations, monitors, keyboards & IT units.",
    icon: Laptop,
    style: getCategoryStyle("computing"),
  },
  {
    id: "av",
    title: "Audio & Visual",
    subtitle: "Cameras & AV",
    description: "Projectors, cameras, microphones & sound gear.",
    icon: Video,
    style: getCategoryStyle("av"),
  },
  {
    id: "transport",
    title: "Transport",
    subtitle: "Vehicles & Carts",
    description: "Service vans, utility carts & mobility units.",
    icon: Truck,
    style: getCategoryStyle("transport"),
  },
  {
    id: "furniture",
    title: "Furniture",
    subtitle: "Chairs & Desks",
    description: "Office chairs, conference tables & cabinets.",
    icon: Armchair,
    style: getCategoryStyle("furniture"),
  },
  {
    id: "medical",
    title: "Medical",
    subtitle: "Clinical Units",
    description: "Diagnostic sets, monitors & clinical units.",
    icon: HeartPulse,
    style: getCategoryStyle("medical"),
  },
  {
    id: "office",
    title: "Office Eqpt",
    subtitle: "Printers & Scanners",
    description: "Laser printers, copiers & document scanners.",
    icon: Printer,
    style: getCategoryStyle("office"),
  },
  {
    id: "electronics",
    title: "Electronics",
    subtitle: "Power & UPS",
    description: "UPS units, power supplies & analyzers.",
    icon: Zap,
    style: getCategoryStyle("electronics"),
  },
  {
    id: "laboratory",
    title: "Laboratory",
    subtitle: "Lab & Testing",
    description: "Centrifuges, incubators & testing gear.",
    icon: FlaskConical,
    style: getCategoryStyle("laboratory"),
  },
  {
    id: "tools",
    title: "Tools",
    subtitle: "Toolkits & Repair",
    description: "Power drills, toolkit cases & safety gear.",
    icon: Wrench,
    style: getCategoryStyle("tools"),
  },
];

function getCategoryIcon(catKeyOrName: string): React.ElementType {
  const norm = (catKeyOrName || "").toLowerCase();
  if (norm.includes("comput") || norm.includes("it") || norm.includes("tech") || norm.includes("laptop")) return Laptop;
  if (norm.includes("av") || norm.includes("audio") || norm.includes("video") || norm.includes("camera") || norm.includes("projector")) return Video;
  if (norm.includes("transport") || norm.includes("vehicle") || norm.includes("mobility") || norm.includes("car") || norm.includes("truck")) return Truck;
  if (norm.includes("furnit") || norm.includes("chair") || norm.includes("table") || norm.includes("desk")) return Armchair;
  if (norm.includes("medic") || norm.includes("clinic") || norm.includes("health") || norm.includes("care") || norm.includes("pharma")) return HeartPulse;
  if (norm.includes("print") || norm.includes("office") || norm.includes("scan") || norm.includes("copi")) return Printer;
  if (norm.includes("electr") || norm.includes("power") || norm.includes("ups") || norm.includes("generat")) return Zap;
  if (norm.includes("lab") || norm.includes("scien") || norm.includes("research") || norm.includes("chem")) return FlaskConical;
  if (norm.includes("tool") || norm.includes("maint") || norm.includes("machin") || norm.includes("repair")) return Wrench;
  return Tag;
}

function StepSelect({
  value,
  onChange,
  requestType,
}: {
  value: BrowseItem[];
  onChange: (items: BrowseItem[]) => void;
  initialType?: "borrow" | "assign" | "requisition" | null;
  requestType?: "borrowable" | "assignable" | "consumable" | null;
}) {
  const [search, setSearch] = useState("");
  const { data: dbCategories = [], isLoading } = useCategoriesQuery();

  // Build category cards dynamically from the Admin Categories
  const categoryCards = useMemo<AssetCategoryCardMeta[]>(() => {
    const adminAssetCats = dbCategories.filter((c) => c.type === "asset" || !c.type);
    if (adminAssetCats.length > 0) {
      return adminAssetCats.map((c) => {
        const style = getCategoryStyle(c.name, c.name, c.colorToken);
        const Icon = getCategoryIcon(c.name);
        return {
          id: c.id,
          title: c.name,
          subtitle: `${c.name} Category`,
          description: `Equipment and units registered under ${c.name}.`,
          icon: Icon,
          style,
        };
      });
    }
    return ASSET_CATEGORIES;
  }, [dbCategories]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categoryCards;
    const q = search.toLowerCase();
    return categoryCards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [categoryCards, search]);

  const toggleCategory = (cat: AssetCategoryCardMeta) => {
    const syntheticId = `cat-${cat.id}`;
    const isSelected = value.some((v) => v.id === syntheticId);
    if (isSelected) {
      onChange(value.filter((v) => v.id !== syntheticId));
    } else {
      const categoryItem: BrowseItem = {
        id: syntheticId,
        name: `${cat.title} Equipment`,
        category: cat.title,
        type: "asset",
        status: "active",
        assignmentType: requestType === "assignable" ? "assignable" : "borrowable",
        assetCode: `CAT-${cat.id.toUpperCase()}`,
        location: "Central Storage",
      };
      onChange([...value, categoryItem]);
    }
  };

  const isAssignable = requestType === "assignable";
  const searchId = `search-categories-${requestType ?? "asset"}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-text truncate">
          {isAssignable ? "Assignment categories" : "Borrow categories"}
        </h3>
        {value.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent/15 text-accent border border-accent/25 shrink-0">
            <Check className="h-3 w-3 stroke-3" />
            {value.length}
          </span>
        )}
        {filteredCategories.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const next = [...value];
              for (const cat of filteredCategories) {
                const syntheticId = `cat-${cat.id}`;
                if (next.some((v) => v.id === syntheticId)) continue;
                next.push({
                  id: syntheticId,
                  name: `${cat.title} Equipment`,
                  category: cat.title,
                  type: "asset",
                  status: "active",
                  assignmentType:
                    requestType === "assignable" ? "assignable" : "borrowable",
                  assetCode: `CAT-${cat.id.toUpperCase()}`,
                  location: "Central Storage",
                });
              }
              onChange(next);
            }}
            className="text-[11px] font-semibold text-accent hover:underline shrink-0"
          >
            Select all
          </button>
        )}
        <div className="relative ml-auto w-44 sm:w-56 shrink-0">
          <label htmlFor={searchId} className="sr-only">
            Search asset categories
          </label>
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary"
            aria-hidden
          />
          <input
            id={searchId}
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 rounded-lg border border-border bg-bg-subtle/50 pl-8 pr-7 text-xs text-text placeholder:text-text-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div>
        {isLoading ? (
          <LoadingState
            variant="inline"
            icon="package"
            message="Loading asset categories..."
            subtitle="Fetching latest inventory data..."
            className="py-8"
          />
        ) : filteredCategories.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-border">
            <Package className="h-7 w-7 text-text-secondary/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-text">No matching category found</p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-2 text-xs text-accent font-semibold hover:underline cursor-pointer"
              >
                Reset search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {filteredCategories.map((cat) => {
              const isSelected = value.some((v) => v.id === `cat-${cat.id}`);
              const style = cat.style;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    "flex flex-col text-left p-3 rounded-lg border transition-all duration-150 cursor-pointer group select-none",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isSelected
                      ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                      : "border-border bg-card hover:border-accent/40 hover:bg-bg-subtle/50"
                  )}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-2 w-full mb-1.5">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-text truncate group-hover:text-accent">
                        {cat.title}
                      </h4>
                      <span
                        className={cn(
                          "inline-block mt-1 px-1.5 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider",
                          style.bg,
                          style.text
                        )}
                      >
                        {cat.subtitle}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "h-5 w-5 rounded-md flex items-center justify-center shrink-0 border",
                        isSelected
                          ? "bg-accent border-accent text-accent-foreground"
                          : "border-border bg-bg-subtle group-hover:border-accent/50"
                      )}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5 stroke-3" /> : null}
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 mb-2">
                    {cat.description}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] w-full mt-auto">
                    <span className="text-text-secondary font-medium truncate">
                      {cat.title}
                    </span>
                    <span className="text-text-secondary font-medium flex items-center gap-1 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-status-active-bg" />
                      {isAssignable ? "Assignable" : "Borrowable"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StepSelectConsumables({
  value,
  onChange,
}: {
  value: BrowseItem[];
  onChange: (items: BrowseItem[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { data: paginatedData, isLoading } = useConsumablesQuery({ limit: 100 });
  const consumables = useMemo(
    () => paginatedData?.data ?? [],
    [paginatedData?.data]
  );

  const supplyItems = useMemo(() => {
    return consumables.map((c) => {
      const free = c.availableQty ?? availableQty(c);
      return {
        id: c.id,
        name: c.name,
        category: c.category,
        type: "consumable" as const,
        status: "available" as const,
        itemCode: c.itemCode,
        unit: c.unit,
        currentQty: free,
        location: c.location,
      };
    });
  }, [consumables]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    supplyItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [supplyItems]);

  const filtered = useMemo(() => {
    let list = supplyItems;
    if (selectedCategory !== "all") {
      list = list.filter((item) => item.category?.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [supplyItems, search, selectedCategory]);

  const toggleItem = (item: (typeof supplyItems)[number]) => {
    const isSelected = value.some((v) => v.id === item.id);
    if (isSelected) {
      onChange(value.filter((v) => v.id !== item.id));
    } else {
      onChange([...value, item]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-text truncate">Supplies</h3>
        {value.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent/15 text-accent border border-accent/25 shrink-0">
            <Check className="h-3 w-3 stroke-3" />
            {value.length}
          </span>
        )}
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const next = [...value];
              for (const item of filtered) {
                if (next.some((v) => v.id === item.id)) continue;
                next.push(item);
              }
              onChange(next);
            }}
            className="text-[11px] font-semibold text-accent hover:underline shrink-0"
          >
            Select all
          </button>
        )}
        <div className="relative ml-auto w-44 sm:w-56 shrink-0">
          <label htmlFor="search-supplies" className="sr-only">
            Search supplies
          </label>
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary"
            aria-hidden
          />
          <input
            id="search-supplies"
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 rounded-lg border border-border bg-bg-subtle/50 pl-8 pr-7 text-xs text-text placeholder:text-text-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {categories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer shrink-0",
              selectedCategory === "all"
                ? "bg-accent/15 text-accent border-accent/40 font-bold"
                : "bg-card border-border text-text-secondary hover:border-accent/40 hover:text-text"
            )}
          >
            All ({supplyItems.length})
          </button>
          {categories.map((cat) => {
            const count = supplyItems.filter((i) => i.category === cat).length;
            const isCatActive = selectedCategory.toLowerCase() === cat.toLowerCase();
            const catStyle = getCategoryStyle(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(isCatActive ? "all" : cat)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                  isCatActive
                    ? "bg-accent/15 text-accent border-accent/40 font-bold"
                    : "bg-card border-border text-text-secondary hover:border-accent/40 hover:text-text"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", catStyle.bg)} />
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div>
        {isLoading ? (
          <LoadingState
            variant="inline"
            icon="package"
            message="Loading supplies..."
            subtitle="Fetching consumable inventory..."
            className="py-8"
          />
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-border">
            <FlaskConical className="h-7 w-7 text-text-secondary/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-text">No supplies found</p>
            {(search || selectedCategory !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                }}
                className="mt-2 text-xs text-accent font-semibold hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {filtered.map((item) => {
              const isSelected = value.some((v) => v.id === item.id);
              const style = getCategoryStyle(item.category);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item)}
                  className={cn(
                    "flex flex-col text-left p-3 rounded-lg border transition-all duration-150 cursor-pointer group select-none",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isSelected
                      ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                      : "border-border bg-card hover:border-accent/40 hover:bg-bg-subtle/50"
                  )}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-2 w-full mb-1.5">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-text truncate group-hover:text-accent">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-mono text-text-secondary truncate mt-0.5">
                        {item.itemCode}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "h-5 w-5 rounded-md flex items-center justify-center shrink-0 border",
                        isSelected
                          ? "bg-accent border-accent text-accent-foreground"
                          : "border-border bg-bg-subtle group-hover:border-accent/50"
                      )}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5 stroke-3" /> : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px] w-full mt-auto">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-bold text-[9px] uppercase tracking-wider truncate",
                        style.bg,
                        style.text
                      )}
                    >
                      {item.category || "Consumable"}
                    </span>
                    <span className="text-text-secondary font-medium flex items-center gap-1 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-status-active-bg" />
                      {item.unit ? `Per ${item.unit}` : "Available"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Request Details (per-type purposes + manual department) ──────────

function StepDetails({
  values,
  onChange,
  errors,
  me,
}: {
  values: WizardFormValues;
  onChange: (patch: Partial<WizardFormValues>) => void;
  errors: Record<string, string>;
  me?: MeProfile;
}) {
  const { data: departments = [] } = useDepartmentsQuery({
    // Borrowers resolve department from their profile; staff catalog is staff-shell only.
    enabled: Boolean(me && me.role !== "borrower"),
  });
  const isManual = values.requesterMode === "manual";

  const updateBundle = useCallback(
    (requestType: WizardRequestType, patch: Partial<WizardTypeBundle>) => {
      onChange({
        typeBundles: values.typeBundles.map((b) =>
          b.requestType === requestType ? { ...b, ...patch } : b
        ),
      });
    },
    [onChange, values.typeBundles]
  );

  const updateGroup = useCallback(
    (
      requestType: WizardRequestType,
      groupId: string,
      patch: Partial<WizardPurposeGroup>
    ) => {
      const bundle = values.typeBundles.find((b) => b.requestType === requestType);
      if (!bundle) return;
      updateBundle(requestType, {
        purposeGroups: bundle.purposeGroups.map((g) =>
          g.id === groupId ? { ...g, ...patch } : g
        ),
      });
    },
    [updateBundle, values.typeBundles]
  );

  const setLineQty = useCallback(
    (
      requestType: WizardRequestType,
      groupId: string,
      itemId: string,
      quantity: number
    ) => {
      const bundle = values.typeBundles.find((b) => b.requestType === requestType);
      if (!bundle) return;
      const clamped = Math.max(1, quantity);
      updateBundle(requestType, {
        purposeGroups: bundle.purposeGroups.map((g) =>
          g.id !== groupId
            ? g
            : {
                ...g,
                lines: g.lines.map((l) =>
                  l.itemId === itemId ? { ...l, quantity: clamped } : l
                ),
              }
        ),
      });
    },
    [updateBundle, values.typeBundles]
  );

  const addLineToGroup = useCallback(
    (requestType: WizardRequestType, groupId: string, itemId: string) => {
      if (!itemId) return;
      const bundle = values.typeBundles.find((b) => b.requestType === requestType);
      if (!bundle) return;
      updateBundle(requestType, {
        purposeGroups: bundle.purposeGroups.map((g) => {
          if (g.id !== groupId) return g;
          if (g.lines.some((l) => l.itemId === itemId)) return g;
          return { ...g, lines: [...g.lines, { itemId, quantity: 1 }] };
        }),
      });
    },
    [updateBundle, values.typeBundles]
  );

  const removeLine = useCallback(
    (requestType: WizardRequestType, groupId: string, itemId: string) => {
      const bundle = values.typeBundles.find((b) => b.requestType === requestType);
      if (!bundle) return;
      updateBundle(requestType, {
        purposeGroups: bundle.purposeGroups.map((g) =>
          g.id !== groupId
            ? g
            : { ...g, lines: g.lines.filter((l) => l.itemId !== itemId) }
        ),
      });
    },
    [updateBundle, values.typeBundles]
  );

  const removeGroup = useCallback(
    (requestType: WizardRequestType, groupId: string) => {
      const bundle = values.typeBundles.find((b) => b.requestType === requestType);
      if (!bundle || bundle.purposeGroups.length <= 1) return;
      updateBundle(requestType, {
        purposeGroups: bundle.purposeGroups.filter((g) => g.id !== groupId),
      });
    },
    [updateBundle, values.typeBundles]
  );

  const setRequesterMode = useCallback(
    (mode: "account" | "manual") => {
      if (mode === "account") {
        onChange({
          requesterMode: "account",
          requestedByName: me?.name ?? "",
          department: me?.department ?? "",
          departmentId: me?.departmentId ?? null,
        });
      } else {
        onChange({ requesterMode: "manual" });
      }
    },
    [me, onChange]
  );

  return (
    <div className="space-y-4">
      {/* ── Requester ─────────────────────────────────────────────── */}
      <section
        aria-label="Requester"
        className="rounded-lg border border-border bg-card p-3 shadow-xs space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-accent" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-text">
              Requester details
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Requester entry mode"
            className="inline-flex rounded-lg border border-border bg-bg-subtle p-0.5"
          >
            {(
              [
                { id: "account" as const, label: "Use my account" },
                { id: "manual" as const, label: "Enter manually" },
              ]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={values.requesterMode === opt.id}
                onClick={() => setRequesterMode(opt.id)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                  values.requesterMode === opt.id
                    ? "bg-accent text-accent-foreground shadow-2xs"
                    : "text-text-secondary hover:text-text"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isManual ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="requestedByName" className="text-xs font-bold text-text">
                Requested by <span className="text-status-outofservice-bg">*</span>
              </label>
              <input
                id="requestedByName"
                type="text"
                value={values.requestedByName}
                onChange={(e) => onChange({ requestedByName: e.target.value })}
                placeholder="Full name of the person requesting…"
                className={cn(
                  "w-full h-8 rounded-md border bg-bg px-2.5 text-xs text-text placeholder:text-text-secondary/70",
                  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
                  errors.requestedByName
                    ? "border-status-outofservice-bg bg-status-outofservice-bg/5"
                    : "border-border"
                )}
              />
              {errors.requestedByName && (
                <p className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.requestedByName}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="department" className="text-xs font-bold text-text">
                Department <span className="text-status-outofservice-bg">*</span>
              </label>
              <input
                id="department"
                type="text"
                list="department-options"
                value={values.department}
                onChange={(e) => {
                  const text = e.target.value;
                  const match = departments.find(
                    (d) => d.name.toLowerCase() === text.trim().toLowerCase()
                  );
                  onChange({
                    department: text,
                    departmentId: match?.id ?? null,
                  });
                }}
                placeholder="Select or type a department…"
                className={cn(
                  "w-full h-8 rounded-md border bg-bg px-2.5 text-xs text-text placeholder:text-text-secondary/70",
                  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
                  errors.department
                    ? "border-status-outofservice-bg bg-status-outofservice-bg/5"
                    : "border-border"
                )}
              />
              <datalist id="department-options">
                {departments.map((d) => (
                  <option key={d.id} value={d.name} />
                ))}
              </datalist>
              {errors.department ? (
                <p className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.department}
                </p>
              ) : (
                <p className="text-[11px] text-text-secondary">
                  Pick from the list or type a department not in the catalog.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="space-y-1.5">
              <label htmlFor="requestedByName-account" className="text-xs font-bold text-text">
                Requested by <span className="text-status-outofservice-bg">*</span>
              </label>
              <input
                id="requestedByName-account"
                type="text"
                value={values.requestedByName}
                onChange={(e) => onChange({ requestedByName: e.target.value })}
                placeholder="Name of the person this request is for…"
                className={cn(
                  "w-full h-8 rounded-md border bg-bg px-2.5 text-xs text-text placeholder:text-text-secondary/70",
                  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
                  errors.requestedByName
                    ? "border-status-outofservice-bg bg-status-outofservice-bg/5"
                    : "border-border"
                )}
              />
              {errors.requestedByName ? (
                <p className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.requestedByName}
                </p>
              ) : (
                <p className="text-[11px] text-text-secondary">
                  Defaults to your account name. Change it if requesting on behalf of someone else.
                </p>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 rounded-lg border border-border bg-bg-subtle/40 p-2.5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
                  Department
                </p>
                <p className="text-xs font-semibold text-text mt-0.5 truncate">
                  {values.department || me?.department || "Not linked"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
                  Account email
                </p>
                <p className="text-xs font-semibold text-text mt-0.5 truncate">
                  {me?.email || "—"}
                </p>
              </div>
              {errors.department && (
                <p className="sm:col-span-2 text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.department} Switch to{" "}
                  <span className="font-bold">Enter manually</span> to fix.
                </p>
              )}
            </div>
          </div>
        )}

      </section>

      {values.typeBundles.map((bundle) => {
        const itemsById = new Map(
          bundle.selectedItems.map((item) => [item.id, item])
        );
        const assignedAnywhere = new Set(
          bundle.purposeGroups.flatMap((g) => g.lines.map((l) => l.itemId))
        );
        const unassigned = bundle.selectedItems.filter(
          (i) => !assignedAnywhere.has(i.id)
        );
        return (
          <section
            key={bundle.requestType}
            aria-label={`${typeLabel(bundle.requestType)} purposes`}
            className="space-y-2.5 rounded-lg border border-border bg-card p-3 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 text-accent shrink-0" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-text truncate">
                  {typeLabel(bundle.requestType)}
                  <span className="text-status-outofservice-bg"> *</span>
                </p>
                <span className="text-[10px] font-semibold text-text-secondary rounded-md border border-border px-1.5 py-0.5 shrink-0">
                  {bundle.selectedItems.length} item
                  {bundle.selectedItems.length === 1 ? "" : "s"} ·{" "}
                  {bundle.purposeGroups.length} purpose
                  {bundle.purposeGroups.length === 1 ? "" : "s"}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateBundle(bundle.requestType, {
                    purposeGroups: [
                      ...bundle.purposeGroups,
                      newPurposeGroup(),
                    ],
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent/10 shrink-0"
              >
                <Plus className="h-3 w-3" />
                Add purpose
              </button>
            </div>

            {errors[`bundle_${bundle.requestType}`] && (
              <p className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors[`bundle_${bundle.requestType}`]}
              </p>
            )}

            {bundle.requestType === "borrowable" && (
              <div className="rounded-lg border border-border bg-bg-subtle/30 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-accent" />
                  <p className="text-xs font-bold text-text">
                    Borrow schedule
                  </p>
                  <span className="text-[10px] text-text-secondary">
                    Applies to borrowed equipment only
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="dateFrom"
                      className="text-xs font-semibold text-text"
                    >
                      Checkout date{" "}
                      <span className="text-status-outofservice-bg">*</span>
                    </label>
                    <input
                      id="dateFrom"
                      type="date"
                      value={values.dateFrom}
                      min={today()}
                      onChange={(e) => onChange({ dateFrom: e.target.value })}
                      className={cn(
                        "w-full h-8 rounded-md border bg-bg px-2 text-xs text-text",
                        "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
                        errors.dateFrom
                          ? "border-status-outofservice-bg bg-status-outofservice-bg/5"
                          : "border-border"
                      )}
                    />
                    {errors.dateFrom && (
                      <p className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {errors.dateFrom}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="dateTo"
                      className="text-xs font-semibold text-text"
                    >
                      Expected return{" "}
                      <span className="text-status-outofservice-bg">*</span>
                    </label>
                    <input
                      id="dateTo"
                      type="date"
                      value={values.dateTo}
                      min={values.dateFrom || today()}
                      onChange={(e) => onChange({ dateTo: e.target.value })}
                      className={cn(
                        "w-full h-8 rounded-md border bg-bg px-2 text-xs text-text",
                        "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
                        errors.dateTo
                          ? "border-status-outofservice-bg bg-status-outofservice-bg/5"
                          : "border-border"
                      )}
                    />
                    {errors.dateTo && (
                      <p className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {errors.dateTo}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {unassigned.length > 0 && (
              <div className="rounded-lg border border-status-repair-bg/40 bg-status-repair-bg/10 px-3 py-2 flex flex-wrap items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-status-repair-bg shrink-0" />
                <p className="text-[11px] font-semibold text-text">
                  Not assigned to a purpose yet:
                </p>
                {unassigned.map((item) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const catMeta = getCategoryStyle(item.category as any);
                  return (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-text"
                    >
                      <Tag className={cn("h-3 w-3", catMeta.text)} />
                      {item.name}
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const first = bundle.purposeGroups[0];
                    if (!first) return;
                    unassigned.forEach((item) =>
                      addLineToGroup(bundle.requestType, first.id, item.id)
                    );
                  }}
                  className="ml-auto text-[11px] font-semibold text-accent hover:underline"
                >
                  Add all to Purpose 1
                </button>
              </div>
            )}

            <div className="space-y-2.5">
              {bundle.purposeGroups.map((group, idx) => {
                const assignedIds = new Set(group.lines.map((l) => l.itemId));
                const availableToAdd = bundle.selectedItems.filter(
                  (i) => !assignedIds.has(i.id)
                );
                const errKey = `${bundle.requestType}_${group.id}`;
                return (
                  <div
                    key={group.id}
                    className="rounded-lg border border-border bg-bg-subtle/30 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 shrink-0 rounded-md bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <input
                        id={`purpose-${group.id}`}
                        type="text"
                        value={group.purpose}
                        onChange={(e) =>
                          updateGroup(bundle.requestType, group.id, {
                            purpose: e.target.value,
                          })
                        }
                        placeholder="Purpose — reason, project, or clinical task…"
                        aria-label={`Purpose ${idx + 1}`}
                        className={cn(
                          "flex-1 min-w-0 h-8 rounded-md border bg-bg px-2.5 text-xs text-text placeholder:text-text-secondary/70",
                          "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
                          errors[`purpose_${errKey}`]
                            ? "border-status-outofservice-bg"
                            : "border-border"
                        )}
                      />
                      {bundle.purposeGroups.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeGroup(bundle.requestType, group.id)
                          }
                          className="p-1.5 rounded-md text-text-secondary hover:text-status-outofservice-bg hover:bg-status-outofservice-bg/10 shrink-0"
                          aria-label={`Remove purpose ${idx + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {errors[`purpose_${errKey}`] && (
                      <p className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1 pl-7">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {errors[`purpose_${errKey}`]}
                      </p>
                    )}

                    <div className="grid gap-1.5 sm:grid-cols-2 pl-7">
                      {group.lines.map((line) => {
                        const item = itemsById.get(line.itemId);
                        if (!item) return null;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const catMeta = getCategoryStyle(item.category as any);
                        return (
                          <div
                            key={line.itemId}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5"
                          >
                            <Tag
                              className={cn("h-3 w-3 shrink-0", catMeta.text)}
                            />
                            <p className="text-xs font-semibold text-text truncate flex-1 min-w-0">
                              {item.name}
                            </p>
                            <div className="flex items-center rounded-md border border-border bg-bg-subtle p-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setLineQty(
                                    bundle.requestType,
                                    group.id,
                                    line.itemId,
                                    line.quantity - 1
                                  )
                                }
                                disabled={line.quantity <= 1}
                                className="h-5 w-5 rounded flex items-center justify-center text-text-secondary disabled:opacity-30"
                                aria-label={`Decrease quantity for ${item.name}`}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-6 px-0.5 text-center text-xs font-bold">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setLineQty(
                                    bundle.requestType,
                                    group.id,
                                    line.itemId,
                                    line.quantity + 1
                                  )
                                }
                                className="h-5 w-5 rounded flex items-center justify-center text-text-secondary"
                                aria-label={`Increase quantity for ${item.name}`}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                removeLine(
                                  bundle.requestType,
                                  group.id,
                                  line.itemId
                                )
                              }
                              className="p-0.5 rounded text-text-secondary hover:text-status-outofservice-bg shrink-0"
                              aria-label={`Remove ${item.name} from this purpose`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {group.lines.length === 0 && (
                        <p className="text-[11px] text-text-secondary sm:col-span-2">
                          No items yet — add at least one below.
                        </p>
                      )}
                    </div>

                    <div className="pl-7 space-y-1.5">
                      {availableToAdd.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            addLineToGroup(
                              bundle.requestType,
                              group.id,
                              e.target.value
                            );
                            e.target.value = "";
                          }}
                          aria-label={`Add item to purpose ${idx + 1}`}
                          className="w-full h-8 rounded-lg border border-dashed border-border bg-card px-2 text-xs font-medium text-text-secondary focus:outline-none focus:border-accent"
                        >
                          <option value="">+ Add item to this purpose…</option>
                          {availableToAdd.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {errors[`lines_${errKey}`] && (
                        <p className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {errors[`lines_${errKey}`]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <section
        aria-label="Additional Notes"
        className="rounded-lg border border-border bg-card p-3 shadow-xs space-y-1.5"
      >
        <div className="flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5 text-text-secondary" />
          <label
            htmlFor="notes"
            className="text-[11px] font-bold uppercase tracking-wider text-text"
          >
            Additional Notes{" "}
            <span className="text-text-secondary font-normal normal-case">
              (optional)
            </span>
          </label>
        </div>
        <textarea
          id="notes"
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
          placeholder="Specify any special delivery instructions, accessories, or condition notes…"
          className="w-full rounded-md border border-border bg-bg px-2.5 py-2 text-xs text-text placeholder:text-text-secondary/70 resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </section>
    </div>
  );
}

// ─── Step 3: Review ───────────────────────────────────────────────────────────

function StepReview({
  values,
  me,
}: {
  values: WizardFormValues;
  me?: MeProfile;
}) {
  if (values.typeBundles.length === 0) return null;

  const requester = {
    name: me?.name || "Your name",
    email: me?.email || "Your email",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-bg-subtle">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Request types
          </p>
          <p className="text-sm font-bold text-text mt-0.5">
            {values.typeBundles.map((b) => typeLabel(b.requestType)).join(" · ")}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md border border-border bg-card">
          {values.typeBundles.length} type
          {values.typeBundles.length > 1 ? "s" : ""}
        </span>
      </div>

      <section className="space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-1">
          Requesting department
        </h3>
        <div className="rounded-lg border border-border bg-card p-3 grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
              Requested By
            </p>
            <p className="font-medium text-text mt-0.5">
              {values.requestedByName.trim() || requester.name}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
              Department account
            </p>
            <p className="font-medium text-text mt-0.5">{requester.name}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
              Department
            </p>
            <p className="font-medium text-text mt-0.5">
              {values.department.trim() || "Unspecified"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
              Email Address
            </p>
            <p className="font-medium text-text mt-0.5">{requester.email}</p>
          </div>
        </div>
      </section>

      {values.typeBundles.map((bundle) => {
        const itemsById = new Map(
          bundle.selectedItems.map((item) => [item.id, item])
        );
        return (
          <section key={bundle.requestType} className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-1">
              {typeLabel(bundle.requestType)}
            </h3>
            {bundle.requestType === "borrowable" && (
              <div className="rounded-lg border border-border bg-card px-3 py-2.5 grid grid-cols-2 gap-x-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
                    Checkout Date
                  </p>
                  <p className="font-medium text-text mt-0.5">
                    {values.dateFrom}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
                    Expected Return
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-status-outofservice-bg" />
                    <p className="font-medium text-status-outofservice-bg">
                      {values.dateTo}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {bundle.purposeGroups.map((group, idx) => (
              <div
                key={group.id}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <div className="px-3 py-2 bg-accent/5 border-b border-accent/20">
                  <p className="text-[10px] uppercase tracking-wider text-accent font-semibold">
                    Purpose {idx + 1}
                  </p>
                  <p className="text-sm font-medium text-text mt-0.5">
                    {group.purpose.trim() || "—"}
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {group.lines.map((line) => {
                    const item = itemsById.get(line.itemId);
                    if (!item) return null;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const categoryMeta = getCategoryStyle(item.category as any);
                    return (
                      <div
                        key={`${group.id}-${line.itemId}`}
                        className="px-3 py-2.5 flex items-center gap-3 bg-bg-subtle/30"
                      >
                        <div
                          className={cn(
                            "h-8 w-8 shrink-0 rounded-md flex items-center justify-center border border-transparent",
                            categoryMeta.bg
                          )}
                        >
                          <Tag className={cn("h-4 w-4", categoryMeta.text)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-text-secondary font-mono mt-0.5 uppercase tracking-wide">
                            {item.type === "asset"
                              ? item.assetCode
                              : item.itemCode}
                            {" · "}
                            {categoryMeta.label}
                          </p>
                        </div>
                        <div className="text-right px-2">
                          <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
                            Qty
                          </p>
                          <p className="font-bold text-xs text-text">
                            {formatQuantityWithUnit(
                              line.quantity,
                              item.type === "consumable"
                                ? (item as BrowseConsumableItem).unit
                                : null,
                              item.type
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {values.notes && (
        <section aria-label="Additional notes">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-text-secondary mb-1">
              Notes
            </p>
            <p className="text-sm text-text">{values.notes}</p>
          </div>
        </section>
      )}

      <p className="text-xs text-text-secondary text-center max-w-sm mx-auto">
        Each request type is submitted as its own request code for custodian
        review.
      </p>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

interface NewBorrowRequestWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledItems?: BrowseItem[];
  initialType?: "borrow" | "assign" | "requisition" | null;
  onSuccess: (newRequest: PortalBorrowRequest) => void;
}

export function NewBorrowRequestWizard({
  open,
  onOpenChange,
  prefilledItems,
  initialType,
  onSuccess,
}: NewBorrowRequestWizardProps) {
  const typeLocked = Boolean(initialType);
  const initialTypes: WizardRequestType[] =
    initialType === "requisition"
      ? ["consumable"]
      : initialType === "assign"
        ? ["assignable"]
        : initialType === "borrow"
          ? ["borrowable"]
          : [];

  const [step, setStep] = useState<RequestWizardStep>(
    prefilledItems && prefilledItems.length > 0
      ? "details"
      : typeLocked
        ? "select"
        : "type"
  );
  const [values, setValues] = useState<WizardFormValues>(() => {
    const base = emptyWizardValues(initialTypes);
    if (prefilledItems && prefilledItems.length > 0 && base.typeBundles[0]) {
      base.typeBundles[0] = {
        ...base.typeBundles[0],
        selectedItems: prefilledItems,
      };
    }
    return base;
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");

  const {
    mutateAsync: createRequest,
    isPending: isSubmittingAsset,
    isSuccess: isSubmittedAsset,
    reset: resetAsset,
  } = useCreateBorrowRequestMutation();
  const {
    mutateAsync: createConsumableRequest,
    isPending: isSubmittingSupply,
    isSuccess: isSubmittedSupply,
    reset: resetSupply,
  } = useCreateConsumableRequestMutation();
  const isSubmitting = isSubmittingAsset || isSubmittingSupply;
  const isSubmitted = isSubmittedAsset || isSubmittedSupply;
  const resetMutation = useCallback(() => {
    resetAsset();
    resetSupply();
  }, [resetAsset, resetSupply]);
  const { data: me } = useMeQuery();

  useEffect(() => {
    if (!open) return;
    const types: WizardRequestType[] =
      initialType === "requisition"
        ? ["consumable"]
        : initialType === "assign"
          ? ["assignable"]
          : initialType === "borrow"
            ? ["borrowable"]
            : [];
    const base = emptyWizardValues(types);
    if (prefilledItems && prefilledItems.length > 0 && base.typeBundles[0]) {
      base.typeBundles[0] = {
        ...base.typeBundles[0],
        selectedItems: prefilledItems,
      };
    }
    setStep(
      prefilledItems && prefilledItems.length > 0
        ? "details"
        : typeLocked
          ? "select"
          : "type"
    );
    setValues(base);
    setFieldErrors({});
    setErrorMessage("");
    resetMutation();
  }, [open, prefilledItems, resetMutation, initialType, typeLocked]);

  useEffect(() => {
    if (!open || !me) return;
    setValues((prev) => {
      if (prev.requesterMode === "manual" && prev.requestedByName.trim()) {
        return prev;
      }
      return {
        ...prev,
        requesterMode: prev.requesterMode || "account",
        departmentId: me.departmentId ?? prev.departmentId,
        department: me.department || prev.department,
        // Prefill once; do not overwrite if the requester already edited the name.
        requestedByName: prev.requestedByName.trim() || me.name || "",
      };
    });
  }, [open, me]);

  const patchValues = useCallback(
    (patch: Partial<WizardFormValues>) =>
      setValues((p) => ({ ...p, ...patch })),
    []
  );

  const selectedTypes = values.typeBundles.map((b) => b.requestType);

  const toggleType = useCallback(
    (type: WizardRequestType) => {
      if (typeLocked) return;
      setValues((prev) => {
        const exists = prev.typeBundles.some((b) => b.requestType === type);
        if (exists) {
          return {
            ...prev,
            typeBundles: prev.typeBundles.filter((b) => b.requestType !== type),
          };
        }
        return {
          ...prev,
          typeBundles: [...prev.typeBundles, newTypeBundle(type)],
        };
      });
    },
    [typeLocked]
  );

  const updateBundleItems = useCallback(
    (requestType: WizardRequestType, items: BrowseItem[]) => {
      setValues((prev) => ({
        ...prev,
        typeBundles: prev.typeBundles.map((b) =>
          b.requestType === requestType
            ? {
                ...b,
                selectedItems: items,
                // Drop lines that reference removed items.
                purposeGroups: b.purposeGroups.map((g) => ({
                  ...g,
                  lines: g.lines.filter((l) =>
                    items.some((i) => i.id === l.itemId)
                  ),
                })),
              }
            : b
        ),
      }));
    },
    []
  );

  const canAdvanceType = values.typeBundles.length > 0;
  const canAdvanceSelect = values.typeBundles.every(
    (b) => b.selectedItems.length > 0
  );

  function validateDetails(): Record<string, string> {
    const errs: Record<string, string> = {};
    const hasBorrowable = values.typeBundles.some(
      (b) => b.requestType === "borrowable"
    );
    if (hasBorrowable) {
      if (!values.dateFrom) errs.dateFrom = "Start date is required.";
      if (!values.dateTo) errs.dateTo = "End date is required.";
      else if (values.dateTo < values.dateFrom)
        errs.dateTo = "End date must be on or after start date.";
    }
    if (!values.departmentId && !values.department.trim()) {
      errs.department = "Select or enter a requesting department.";
    }
    if (!values.requestedByName.trim())
      errs.requestedByName = "Requested by is required.";

    values.typeBundles.forEach((bundle) => {
      if (bundle.purposeGroups.length < 1) {
        errs[`bundle_${bundle.requestType}`] =
          "Add at least one purpose for this request type.";
      }
      bundle.purposeGroups.forEach((g) => {
        const errKey = `${bundle.requestType}_${g.id}`;
        if (!g.purpose.trim()) {
          errs[`purpose_${errKey}`] = "Purpose is required.";
        }
        if (g.lines.length < 1) {
          errs[`lines_${errKey}`] =
            "Add at least one item under this purpose.";
        }
      });
    });
    return errs;
  }

  function handleNext() {
    if (step === "type") {
      if (!canAdvanceType) return;
      setStep("select");
    } else if (step === "select") {
      if (!canAdvanceSelect) return;
      setValues((prev) => ({
        ...prev,
        typeBundles: prev.typeBundles.map((b) => ({
          ...b,
          purposeGroups: b.purposeGroups.map((g, i) =>
            i === 0 && g.lines.length === 0
              ? {
                  ...g,
                  lines: b.selectedItems.map((item) => ({
                    itemId: item.id,
                    quantity: 1,
                  })),
                }
              : g
          ),
        })),
      }));
      setStep("details");
    } else if (step === "details") {
      const errs = validateDetails();
      setFieldErrors(errs);
      if (Object.keys(errs).length === 0) setStep("review");
    }
  }

  function handleBack() {
    if (step === "select") {
      if (!typeLocked) setStep("type");
      return;
    }
    if (step === "details") {
      setStep(
        prefilledItems && prefilledItems.length > 0 && !typeLocked
          ? "type"
          : "select"
      );
      return;
    }
    if (step === "review") setStep("details");
    setErrorMessage("");
  }

  const toast = useToast();

  async function handleSubmit() {
    setErrorMessage("");

    try {
      const isValidUuid = (str?: string | null) =>
        Boolean(
          str &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              str
            )
        );

      if (!me?.id || !me.email) {
        setErrorMessage(
          "Your profile could not be loaded. Sign in again and retry."
        );
        return;
      }
      if (!values.departmentId && !values.department.trim()) {
        setErrorMessage("Select or enter a requesting department.");
        return;
      }

      const departmentPayload = {
        departmentId: isValidUuid(values.departmentId)
          ? values.departmentId!
          : undefined,
        department: values.department.trim() || undefined,
      };
      const submissionGroupId =
        values.typeBundles.length > 1 ? crypto.randomUUID() : undefined;

      let lastPortal: PortalBorrowRequest | null = null;
      const codes: string[] = [];

      for (const bundle of values.typeBundles) {
        // Typed request pages lock to one kind — never create sibling types from this entry.
        if (
          typeLocked &&
          ((initialType === "assign" && bundle.requestType !== "assignable") ||
            (initialType === "borrow" && bundle.requestType !== "borrowable") ||
            (initialType === "requisition" && bundle.requestType !== "consumable"))
        ) {
          continue;
        }
        const itemsById = new Map(
          bundle.selectedItems.map((item) => [item.id, item])
        );
        const flatLines = bundle.purposeGroups.flatMap((group) =>
          group.lines.map((line) => {
            const item = itemsById.get(line.itemId);
            if (!item) return null;
            const isRealAssetUuid =
              item.type === "asset" && isValidUuid(item.id);
            const isRealConsumableUuid =
              item.type === "consumable" && isValidUuid(item.id);
            return {
              itemDescription: item.name,
              assetId: isRealAssetUuid ? item.id : undefined,
              assetCode: isRealAssetUuid ? item.assetCode : undefined,
              consumableId: isRealConsumableUuid ? item.id : undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              category: item.category as any,
              quantity: line.quantity,
              itemType: item.type,
              purpose: group.purpose.trim(),
            };
          })
        );
        const items = flatLines.filter(
          (row): row is NonNullable<typeof row> => row != null
        );
        const headerPurpose = summarizePurposes(items.map((i) => i.purpose));

        if (bundle.requestType === "consumable") {
          const supplyLines = items.filter((item) => item.consumableId);
          if (supplyLines.length === 0) {
            setErrorMessage(
              "Select at least one supply item before submitting."
            );
            return;
          }
          const created = await createConsumableRequest({
            requesterUserId: isValidUuid(me.id) ? me.id : undefined,
            requesterName: me.name,
            requesterEmail: me.email,
            ...departmentPayload,
            requestedByName: values.requestedByName.trim() || me.name,
            purpose: headerPurpose,
            notes: values.notes || undefined,
            submissionGroupId,
            lines: supplyLines.map((item) => ({
              consumableId: item.consumableId!,
              quantity: item.quantity,
              purpose: item.purpose,
            })),
          });
          codes.push(created.requestCode);
          lastPortal = mapConsumableRequestToPortal(created);
          continue;
        }

        const createdRequest = await createRequest({
          requesterUserId: isValidUuid(me.id) ? me.id : undefined,
          requesterName: me.name,
          requesterEmail: me.email,
          ...departmentPayload,
          requestType:
            bundle.requestType === "assignable" ? "assignable" : "borrowable",
          items: items
            .filter((item) => item.itemType === "asset")
            .map((item) => ({
              itemDescription: item.itemDescription,
              assetId: item.assetId,
              assetCode: item.assetCode,
              category: item.category,
              quantity: item.quantity,
              itemType: "asset" as const,
              purpose: item.purpose,
            })),
          purpose: headerPurpose,
          expectedReturnDate:
            bundle.requestType === "borrowable" ? values.dateTo : undefined,
          notes: values.notes || undefined,
          requestedByName: values.requestedByName.trim() || me.name,
          submissionGroupId,
        });
        codes.push(createdRequest.requestCode);
        lastPortal = mapBorrowRequestToPortal(createdRequest);
      }

      if (codes.length > 1) {
        toast.success(`Submitted ${codes.length} requests: ${codes.join(", ")}.`);
      } else if (codes.length === 1) {
        toast.success(`Request ${codes[0]} submitted successfully.`);
      }
      if (lastPortal) onSuccess(lastPortal);
      onOpenChange(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErrorMessage(formatFriendlyErrorMessage(e.message));
    }
  }

  const isDirty = useMemo(() => {
    if (step !== "type") return true;
    if (values.typeBundles.some((b) => b.selectedItems.length > 0)) return true;
    if (values.notes?.trim()) return true;
    // Type chips toggled beyond the empty pristine start
    if (!initialType && values.typeBundles.length > 0) return true;
    return Boolean(prefilledItems && prefilledItems.length > 0);
  }, [step, values, initialType, prefilledItems]);

  const handleRequestClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const {
    requestClose,
    onBackdropClick,
    discardConfirmOpen,
    confirmDiscard,
    keepEditing,
  } = useRequestModalDismiss({
    open,
    isPending: isSubmitting,
    isDirty,
    onRequestClose: handleRequestClose,
  });

  if (!open) return null;

  const headerTitle =
    values.typeBundles.length > 1
      ? "New Multi-Type Request"
      : values.typeBundles[0]?.requestType === "consumable" ||
          initialType === "requisition"
        ? "New Supply Request"
        : values.typeBundles[0]?.requestType === "assignable" ||
            initialType === "assign"
          ? "New Assign Request"
          : values.typeBundles[0]?.requestType === "borrowable" ||
              initialType === "borrow"
            ? "New Borrow Request"
            : "New Requests";

  const categoryBadgeLabel =
    values.typeBundles.length > 1
      ? "Multi"
      : values.typeBundles[0]?.requestType === "consumable"
        ? "Supplies"
        : values.typeBundles[0]?.requestType === "assignable"
          ? "Assignment"
          : values.typeBundles[0]
            ? "Borrow"
            : "Portal";

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onBackdropClick}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-3xl max-h-[76vh] rounded-xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="wizard-title" className="text-base font-bold text-text">
                  {headerTitle}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                  {categoryBadgeLabel}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Complete the milestones below to submit your request for
                custodian review.
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              aria-label="Close"
              className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="pt-1">
            <MilestoneStepIndicator
              current={step}
              selectedTypes={selectedTypes}
              hideTypeStep={typeLocked}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 p-4 overflow-y-auto">
          {step === "type" && !typeLocked && (
            <StepType value={selectedTypes} onToggle={toggleType} />
          )}
          {step === "select" && (
            <div className="space-y-4">
              {values.typeBundles.map((bundle, idx) => (
                <section
                  key={bundle.requestType}
                  aria-label={`${typeLabel(bundle.requestType)} items`}
                  className={cn(
                    "space-y-2",
                    idx > 0 && "border-t border-border pt-4"
                  )}
                >
                  {selectedTypes.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 shrink-0 rounded-md bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-text">
                        {typeLabel(bundle.requestType)}
                      </p>
                    </div>
                  )}

                  {bundle.selectedItems.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {bundle.selectedItems.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-text"
                        >
                          {item.name}
                          <button
                            type="button"
                            onClick={() =>
                              updateBundleItems(
                                bundle.requestType,
                                bundle.selectedItems.filter(
                                  (i) => i.id !== item.id
                                )
                              )
                            }
                            className="rounded-full p-0.5 text-text-secondary hover:text-status-outofservice-bg"
                            aria-label={`Remove ${item.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {bundle.requestType === "consumable" ? (
                    <StepSelectConsumables
                      value={bundle.selectedItems}
                      onChange={(items) =>
                        updateBundleItems("consumable", items)
                      }
                    />
                  ) : (
                    <StepSelect
                      value={bundle.selectedItems}
                      onChange={(items) =>
                        updateBundleItems(bundle.requestType, items)
                      }
                      initialType={initialType}
                      requestType={bundle.requestType}
                    />
                  )}
                </section>
              ))}
              {selectedTypes.length > 1 && !canAdvanceSelect && (
                <p className="text-[11px] text-text-secondary">
                  Select at least one item for each request type before
                  continuing.
                </p>
              )}
            </div>
          )}
          {step === "details" && values.typeBundles.length > 0 && (
            <StepDetails
              values={values}
              onChange={patchValues}
              errors={fieldErrors}
              me={me}
            />
          )}
          {step === "review" && (
            <>
              <StepReview values={values} me={me} />
              {errorMessage && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-status-outofservice-bg mt-0.5" />
                  <p className="text-xs text-status-outofservice-bg dark:text-status-outofservice-text">
                    {errorMessage}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting || isSubmitted}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBack}
              disabled={
                step === "type" ||
                (typeLocked && step === "select") ||
                isSubmitting ||
                isSubmitted ||
                (step === "details" &&
                  Boolean(prefilledItems && prefilledItems.length > 0) &&
                  !typeLocked)
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          {step !== "review" ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={
                (step === "type" && !canAdvanceType) ||
                (step === "select" && !canAdvanceSelect)
              }
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-xs"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isSubmitted}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : isSubmitted ? (
                <>
                  <Check className="h-4 w-4" />
                  Submitted
                </>
              ) : (
                <>
                  Submit
                  {values.typeBundles.length > 1
                    ? ` ${values.typeBundles.length} requests`
                    : " request"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>

    <ConfirmDialog
      isOpen={discardConfirmOpen}
      title="Discard draft?"
      description="You have an unfinished request. Closing will discard your progress."
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      variant="warning"
      onConfirm={confirmDiscard}
      onClose={keepEditing}
    />
    </>
  );
}
