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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryStyle } from "@/constants/categories";
import type {
  BrowseItem,
  BrowseAssetItem,
  BrowseConsumableItem,
  WizardFormValues,
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
import { LoadingState } from "@/components/providers/loading-context";
import { useToast } from "@/components/providers/toast-context";
import { formatQuantityWithUnit } from "@/lib/sanitize-display";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split("T")[0];
}

function nextWeek() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
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
  requestType,
}: {
  current: RequestWizardStep;
  requestType?: WizardFormValues["requestType"];
}) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  const selectLabel =
    requestType === "consumable" ? "Select Supplies" : "Select Category";

  return (
    <nav aria-label="Request Progress" className="w-full">
      <ol className="flex items-center justify-between w-full">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isLast = idx === STEPS.length - 1;

          return (
            <li
              key={step.key}
              className={cn(
                "flex items-center",
                isLast ? "flex-none" : "flex-1"
              )}
            >
              <div className="flex items-center gap-2.5">
                {/* Milestone Node */}
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

                {/* Milestone Label */}
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

              {/* Connecting Milestone Bar */}
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
  onChange,
}: {
  value: "borrowable" | "assignable" | "consumable" | null;
  onChange: (type: "borrowable" | "assignable" | "consumable") => void;
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
            const isSelected = value === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(opt.id)}
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
            const isSelected = value === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(opt.id)}
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
  initialType?: "borrow" | "requisition" | null;
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

  return (
    <div className="space-y-3.5 h-full flex flex-col min-h-0">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-text">
              {isAssignable ? "Choose Equipment Categories for Assignment" : "Choose Asset Categories to Borrow"}
            </h3>
            {value.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent/15 text-accent border border-accent/25">
                <Check className="h-3 w-3 stroke-3" />
                {value.length} selected
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Select one or more categories. You will configure item quantities in the next step.
          </p>
        </div>

        <div className="relative w-full sm:w-60">
          <label htmlFor="search-categories" className="sr-only">
            Search asset categories
          </label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary"
            aria-hidden
          />
          <input
            id="search-categories"
            type="search"
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8.5 rounded-lg border border-border bg-white pl-8.5 pr-8 text-xs text-text placeholder:text-text-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-2xs transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="flex-1 min-h-60 overflow-y-auto pr-1">
        {isLoading ? (
          <LoadingState
            variant="inline"
            icon="package"
            message="Loading asset categories..."
            subtitle="Fetching latest inventory data..."
            className="py-12"
          />
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center my-auto rounded-lg border border-dashed border-border bg-white">
            <Package className="h-8 w-8 text-text-secondary/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-text">No matching category found</p>
            <p className="text-xs text-text-secondary mt-0.5">
              No categories match &quot;{search}&quot;. Try another search term.
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-3 text-xs text-accent font-semibold hover:underline cursor-pointer"
              >
                Reset search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCategories.map((cat) => {
              const isSelected = value.some((v) => v.id === `cat-${cat.id}`);
              const style = cat.style;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-lg border transition-all duration-200 relative cursor-pointer group select-none shadow-2xs",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isSelected
                      ? "border-accent bg-accent/4 ring-2 ring-accent/25 shadow-xs"
                      : "border-border bg-white hover:border-accent/40 hover:bg-bg-subtle/40 hover:shadow-xs"
                  )}
                  aria-pressed={isSelected}
                >
                  {/* Card Header: Category Title + Subtitle Tag + Checkbox */}
                  <div className="flex items-start justify-between gap-2 w-full mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-text truncate group-hover:text-accent transition-colors">
                          {cat.title}
                        </h4>
                        <span className={cn("px-1.5 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider", style.bg, style.text)}>
                          {cat.subtitle}
                        </span>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "h-5 w-5 rounded-md flex items-center justify-center shrink-0 border transition-all duration-200 mt-0.5",
                        isSelected
                          ? "bg-accent border-accent text-accent-foreground shadow-2xs"
                          : "border-border bg-bg-subtle/80 group-hover:border-accent/50"
                      )}
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 stroke-3" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-border group-hover:bg-text-secondary/40" />
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 flex-1 mb-2.5">
                    {cat.description}
                  </p>

                  {/* Card Footer Tag */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] w-full mt-auto">
                    <span className="text-text-secondary font-medium text-[11px]">
                      {cat.title}
                    </span>
                    <span className="text-text-secondary font-medium flex items-center gap-1 text-[11px]">
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
    <div className="space-y-3.5 h-full flex flex-col min-h-0">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-text">Select Supplies & Materials</h3>
            {value.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent/15 text-accent border border-accent/25">
                <Check className="h-3 w-3 stroke-3" />
                {value.length} selected
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Select items from available consumable inventory for your department.
          </p>
        </div>

        <div className="relative w-full sm:w-60">
          <label htmlFor="search-supplies" className="sr-only">
            Search supplies
          </label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary"
            aria-hidden
          />
          <input
            id="search-supplies"
            type="search"
            placeholder="Search supplies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8.5 rounded-lg border border-border bg-white pl-8.5 pr-8 text-xs text-text placeholder:text-text-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-2xs transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills (Clean Light Theme with subtle active badge) */}
      {categories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer shrink-0",
              selectedCategory === "all"
                ? "bg-accent/15 text-accent border-accent/40 font-bold shadow-2xs"
                : "bg-white border-border text-text-secondary hover:border-accent/40 hover:text-text hover:bg-bg-subtle"
            )}
          >
            All Categories ({supplyItems.length})
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
                  "px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                  isCatActive
                    ? "bg-accent/15 text-accent border-accent/40 font-bold shadow-2xs"
                    : "bg-white border-border text-text-secondary hover:border-accent/40 hover:text-text hover:bg-bg-subtle"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", catStyle.bg)} />
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Supplies Grid */}
      <div className="flex-1 min-h-60 overflow-y-auto pr-1">
        {isLoading ? (
          <LoadingState
            variant="inline"
            icon="package"
            message="Loading supplies..."
            subtitle="Fetching consumable inventory..."
            className="py-12"
          />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center my-auto rounded-lg border border-dashed border-border bg-white">
            <FlaskConical className="h-8 w-8 text-text-secondary/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-text">No supplies found</p>
            <p className="text-xs text-text-secondary mt-0.5">
              No items match &quot;{search}&quot;. Try another filter.
            </p>
            {(search || selectedCategory !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                }}
                className="mt-3 text-xs text-accent font-semibold hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((item) => {
              const isSelected = value.some((v) => v.id === item.id);
              const style = getCategoryStyle(item.category);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item)}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-lg border transition-all duration-200 relative cursor-pointer group select-none shadow-2xs",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isSelected
                      ? "border-accent bg-accent/4 ring-2 ring-accent/25 shadow-xs"
                      : "border-border bg-white hover:border-accent/40 hover:bg-bg-subtle/40 hover:shadow-xs"
                  )}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-2 w-full mb-1.5">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-text truncate group-hover:text-accent transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-mono text-text-secondary truncate mt-0.5">
                        {item.itemCode}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "h-5 w-5 rounded-md flex items-center justify-center shrink-0 border transition-all duration-200 mt-0.5",
                        isSelected
                          ? "bg-accent border-accent text-accent-foreground shadow-2xs"
                          : "border-border bg-bg-subtle/80 group-hover:border-accent/50"
                      )}
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 stroke-3" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-border group-hover:bg-text-secondary/40" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] pt-2 border-t border-border/50 mt-auto w-full">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-bold text-[9px] uppercase tracking-wider",
                        style.bg,
                        style.text
                      )}
                    >
                      {item.category || "Consumable"}
                    </span>
                    <span className="text-text-secondary font-medium flex items-center gap-1 text-[11px]">
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

// ─── Step 2: Request Details (1 Row for Dates & Quantity + Upgraded UI/UX) ──

function StepDetails({
  items,
  values,
  onChange,
  errors,
  registeredName,
}: {
  items: BrowseItem[];
  values: Omit<WizardFormValues, "selectedItems">;
  onChange: (patch: Partial<Omit<WizardFormValues, "selectedItems">>) => void;
  errors: Record<string, string>;
  /** Department account display name (`me.name`) for optional fill. */
  registeredName?: string | null;
}) {
  const hasAsset = items.some(i => i.type === "asset");
  const isTemporaryLoan = hasAsset && values.requestType !== "assignable";

  // Primary/single item quantity handler for unified 1-row control
  const primaryItem = items[0];
  const primaryQty = primaryItem ? values.quantities[primaryItem.id] || 1 : 1;

  const setPrimaryQty = useCallback((qty: number) => {
    if (!primaryItem) return;
    const clamped = Math.max(1, qty);
    onChange({ quantities: { ...values.quantities, [primaryItem.id]: clamped } });
  }, [primaryItem, values.quantities, onChange]);

  return (
    <div className="space-y-4">
      {/* ── Selected Items Summary Card ── */}
      <section aria-label="Selected Items" className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="bg-bg-subtle/70 px-3.5 py-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-accent" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text">
              Selected Item{items.length > 1 ? `s (${items.length})` : ""}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-text-secondary">
            {values.requestType === "consumable" ? "Supplies Requisition" : values.requestType === "assignable" ? "Assignment Request" : "Borrow Loan"}
          </span>
        </div>

        <div className="divide-y divide-border max-h-36 overflow-y-auto">
          {items.map((item) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const catMeta = getCategoryStyle(item.category as any);
            const itemQty = values.quantities[item.id] || 1;

            return (
              <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-bg-subtle/30 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={cn("h-8 w-8 shrink-0 rounded-lg flex items-center justify-center border", catMeta.bg, "border-transparent")}>
                    <Tag className={cn("h-4 w-4", catMeta.text)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-text truncate">{item.name}</p>
                    <p className="text-[11px] text-text-secondary font-mono">
                      {item.type === "asset" ? item.assetCode : item.itemCode} · <span className="capitalize">{catMeta.label}</span>
                    </p>
                  </div>
                </div>

                {/* Multi-item inline quantity control if more than 1 item */}
                {items.length > 1 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-text-secondary font-semibold">Qty:</span>
                    <div className="flex items-center rounded-lg border border-border bg-bg-subtle p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const newQ = Math.max(1, itemQty - 1);
                          onChange({ quantities: { ...values.quantities, [item.id]: newQ } });
                        }}
                        disabled={itemQty <= 1}
                        className="h-6 w-6 rounded-md flex items-center justify-center text-text-secondary hover:text-text hover:bg-card transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-7 px-1 text-center text-xs font-bold text-text">
                        {itemQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newQ = itemQty + 1;
                          onChange({ quantities: { ...values.quantities, [item.id]: newQ } });
                        }}
                        className="h-6 w-6 rounded-md flex items-center justify-center text-text-secondary hover:text-text hover:bg-card transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    {item.type === "consumable" && (item as BrowseConsumableItem).unit && (
                      <span className="text-xs font-semibold text-accent px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
                        {formatQuantityWithUnit(itemQty, (item as BrowseConsumableItem).unit, item.type).replace(/^\d+\s*/, "")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 1 ROW FOR DATE AND QUANTITY (Responsive Grid) ── */}
      <section aria-label="Schedule and Quantity" className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-3.5 w-3.5 text-accent" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-text">
            Schedule & Quantity Parameters
          </p>
        </div>

        <div
          className={cn(
            "grid gap-3",
            isTemporaryLoan
              ? "grid-cols-1 sm:grid-cols-3"
              : "grid-cols-1 sm:grid-cols-2"
          )}
        >
          {/* Column 1: Date From / Date Needed */}
          <div className="space-y-1.5">
            <label htmlFor="dateFrom" className="flex items-center justify-between text-xs font-bold text-text">
              <span>{!hasAsset ? "Date Needed" : "Checkout Date"}</span>
              <span className="text-status-outofservice-bg">*</span>
            </label>
            <div className="relative">
              <input
                id="dateFrom"
                type="date"
                value={values.dateFrom}
                min={today()}
                onChange={(e) => onChange({ dateFrom: e.target.value })}
                className={cn(
                  "w-full h-10 rounded-xl border bg-bg-subtle/50 px-3 text-sm font-medium text-text transition-all",
                  "focus:outline-none focus:bg-card focus:border-accent focus:ring-2 focus:ring-accent/20",
                  errors.dateFrom ? "border-status-outofservice-bg bg-status-outofservice-bg/5" : "border-border"
                )}
                aria-describedby={errors.dateFrom ? "date-from-err" : undefined}
              />
            </div>
            {errors.dateFrom && (
              <p id="date-from-err" className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.dateFrom}
              </p>
            )}
          </div>

          {/* Column 2: Expected Return Date (Only for temporary asset loans) */}
          {isTemporaryLoan && (
            <div className="space-y-1.5">
              <label htmlFor="dateTo" className="flex items-center justify-between text-xs font-bold text-text">
                <span>Expected Return</span>
                <span className="text-status-outofservice-bg">*</span>
              </label>
              <div className="relative">
                <input
                  id="dateTo"
                  type="date"
                  value={values.dateTo}
                  min={values.dateFrom || today()}
                  onChange={(e) => onChange({ dateTo: e.target.value })}
                  className={cn(
                    "w-full h-10 rounded-xl border bg-bg-subtle/50 px-3 text-sm font-medium text-text transition-all",
                    "focus:outline-none focus:bg-card focus:border-accent focus:ring-2 focus:ring-accent/20",
                    errors.dateTo ? "border-status-outofservice-bg bg-status-outofservice-bg/5" : "border-border"
                  )}
                  aria-describedby={errors.dateTo ? "date-to-err" : undefined}
                />
              </div>
              {errors.dateTo && (
                <p id="date-to-err" className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.dateTo}
                </p>
              )}
            </div>
          )}

          {/* Column 3: Quantity Input / Stepper */}
          <div className="space-y-1.5">
            <label htmlFor="primary-qty" className="flex items-center justify-between text-xs font-bold text-text">
              <span>
                Quantity{" "}
                {primaryItem?.type === "consumable" && (primaryItem as BrowseConsumableItem).unit ? (
                  <span className="text-accent font-semibold">
                    ({formatQuantityWithUnit(primaryQty, (primaryItem as BrowseConsumableItem).unit, primaryItem.type)})
                  </span>
                ) : null}
              </span>
              <span className="text-status-outofservice-bg">*</span>
            </label>

            {items.length <= 1 ? (
              <div className="flex items-center h-10 rounded-xl border border-border bg-bg-subtle/50 p-1 transition-all focus-within:bg-card focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                <button
                  type="button"
                  onClick={() => setPrimaryQty(primaryQty - 1)}
                  disabled={primaryQty <= 1}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-1.5 px-2">
                  <input
                    id="primary-qty"
                    type="number"
                    min={1}
                    value={primaryQty}
                    onChange={(e) => setPrimaryQty(Number(e.target.value))}
                    className="w-12 text-center bg-transparent text-sm font-bold text-text focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {primaryItem?.type === "consumable" && (primaryItem as BrowseConsumableItem).unit && (
                    <span className="text-xs font-semibold text-text-secondary select-none">
                      {formatQuantityWithUnit(primaryQty, (primaryItem as BrowseConsumableItem).unit, primaryItem.type).replace(/^\d+\s*/, "")}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPrimaryQty(primaryQty + 1)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="h-10 rounded-xl border border-border bg-bg-subtle/30 px-3 flex items-center justify-between text-xs text-text-secondary">
                <span>Total Lines</span>
                <span className="font-bold text-text bg-card px-2 py-0.5 rounded-md border border-border">
                  {items.length} item{items.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Requested By ── */}
      <section aria-label="Requested By" className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-accent" />
            <label htmlFor="requestedByName" className="text-[11px] font-bold uppercase tracking-wider text-text">
              Requested By <span className="text-status-outofservice-bg">*</span>
            </label>
          </div>
          {registeredName &&
            values.requestedByName.trim() !== registeredName.trim() && (
              <button
                type="button"
                onClick={() => onChange({ requestedByName: registeredName })}
                className="text-[11px] font-semibold text-accent hover:underline cursor-pointer shrink-0"
              >
                Use registered name ({registeredName})
              </button>
            )}
        </div>

        <input
          id="requestedByName"
          type="text"
          value={values.requestedByName}
          onChange={(e) => onChange({ requestedByName: e.target.value })}
          placeholder="Name of the person this request is for…"
          className={cn(
            "w-full h-10 rounded-xl border bg-bg-subtle/50 px-3 text-sm font-medium text-text placeholder:text-text-secondary transition-all",
            "focus:outline-none focus:bg-card focus:border-accent focus:ring-2 focus:ring-accent/20",
            errors.requestedByName ? "border-status-outofservice-bg bg-status-outofservice-bg/5" : "border-border"
          )}
          aria-describedby={errors.requestedByName ? "requested-by-err" : "requested-by-hint"}
        />
        {errors.requestedByName ? (
          <p id="requested-by-err" className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {errors.requestedByName}
          </p>
        ) : (
          <p id="requested-by-hint" className="text-[11px] text-text-secondary">
            Enter who this request is for. Use registered name to fill your department account display name.
          </p>
        )}
      </section>

      {/* ── Purpose Input Card ── */}
      <section aria-label="Purpose" className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-accent" />
            <label htmlFor="purpose" className="text-[11px] font-bold uppercase tracking-wider text-text">
              Purpose / Justification <span className="text-status-outofservice-bg">*</span>
            </label>
          </div>
          <span className="text-[10px] text-text-secondary font-medium">Required for approval</span>
        </div>

        <textarea
          id="purpose"
          value={values.purpose}
          onChange={(e) => onChange({ purpose: e.target.value })}
          rows={3}
          placeholder="Briefly state the reason, project name, or clinical task for this request…"
          className={cn(
            "w-full rounded-xl border bg-bg-subtle/50 p-3 text-sm text-text placeholder:text-text-secondary transition-all resize-none",
            "focus:outline-none focus:bg-card focus:border-accent focus:ring-2 focus:ring-accent/20",
            errors.purpose ? "border-status-outofservice-bg bg-status-outofservice-bg/5" : "border-border"
          )}
          aria-describedby={errors.purpose ? "purpose-err" : undefined}
        />
        {errors.purpose && (
          <p id="purpose-err" className="text-[11px] font-medium text-status-outofservice-bg flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {errors.purpose}
          </p>
        )}
      </section>

      {/* ── Additional Notes Input Card ── */}
      <section aria-label="Additional Notes" className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5 text-text-secondary" />
          <label htmlFor="notes" className="text-[11px] font-bold uppercase tracking-wider text-text">
            Additional Notes <span className="text-text-secondary font-normal normal-case">(optional)</span>
          </label>
        </div>

        <textarea
          id="notes"
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
          placeholder="Specify any special delivery instructions, accessories, or condition notes…"
          className="w-full rounded-xl border border-border bg-bg-subtle/50 p-3 text-sm text-text placeholder:text-text-secondary transition-all resize-none focus:outline-none focus:bg-card focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </section>
    </div>
  );
}

// ─── Step 3: Review ───────────────────────────────────────────────────────────

function StepReview({ values, me }: { values: WizardFormValues, me?: MeProfile }) {
  const { selectedItems } = values;
  if (!selectedItems || selectedItems.length === 0) return null;

  // Use the actual logged-in user or fallback to mock
  const requester = {
    name: me?.name || "Your name",
    email: me?.email || "Your email",
    department: me?.department || "Unspecified",
  };
  
  const hasAsset = selectedItems.some(i => i.type === "asset");

  const requestTypeLabel =
    values.requestType === "borrowable"
      ? "Borrow Request (Short-Term Loan)"
      : values.requestType === "assignable"
      ? "Assignment Request (Long-Term Custody)"
      : "Supplies Requisition";

  const classificationColor =
    values.requestType === "borrowable"
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
      : values.requestType === "assignable"
      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";

  return (
    <div className="space-y-5">
      {/* ── Request Type Header Badge ── */}
      <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-bg-subtle">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Request Classification</p>
          <p className="text-sm font-bold text-text mt-0.5">{requestTypeLabel}</p>
        </div>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md border", classificationColor)}>
          {values.requestType === "consumable" ? "Requisition" : "Borrow Request"}
        </span>
      </div>

      {/* ── Requester Details ────────────────────────────────────────────── */}
      <section aria-labelledby="requester-details-heading" className="space-y-2">
        <h3 id="requester-details-heading" className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-1">
          Requesting department
        </h3>
        <div className="rounded-lg border border-border bg-card p-3 grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Requested By</p>
            <p className="font-medium text-text mt-0.5">
              {values.requestedByName.trim() || requester.name}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Department account</p>
            <p className="font-medium text-text mt-0.5">{requester.name}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Department</p>
            <p className="font-medium text-text mt-0.5">{requester.department}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Email Address</p>
            <p className="font-medium text-text mt-0.5">{requester.email}</p>
          </div>
        </div>
      </section>

      {/* ── Request Details ──────────────────────────────────────────────── */}
      <section aria-labelledby="request-details-heading" className="space-y-2">
        <h3 id="request-details-heading" className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-1">
          Requested Items
        </h3>
        <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
          {selectedItems.map((item) => {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const categoryMeta = getCategoryStyle(item.category as any);
             return (
               <div key={item.id} className="px-3 py-2.5 flex items-center gap-3 bg-bg-subtle/30">
                 <div className={cn("h-8 w-8 shrink-0 rounded-md flex items-center justify-center border", categoryMeta.bg, "border-transparent")}>
                   <Tag className={cn("h-4 w-4", categoryMeta.text)} />
                 </div>
                 <div className="flex-1">
                   <p className="text-sm font-medium text-text">{item.name}</p>
                   <p className="text-[10px] text-text-secondary font-mono mt-0.5 uppercase tracking-wide">
                     {item.type === "asset" ? item.assetCode : item.itemCode}
                     {" · "}
                     {categoryMeta.label}
                   </p>
                 </div>
                 <div className="text-right px-2">
                   <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Qty</p>
                   <p className="font-bold text-xs text-text">
                     {formatQuantityWithUnit(
                       values.quantities[item.id] || 1,
                       item.type === "consumable" ? (item as BrowseConsumableItem).unit : null,
                       item.type
                     )}
                   </p>
                 </div>
               </div>
             )
          })}

          {/* Dates & Qty */}
          <div className="px-3 py-3 grid grid-cols-2 gap-y-3 gap-x-4 text-sm bg-card">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">{!hasAsset ? "Date Needed" : "Checkout Date"}</p>
              <p className="font-medium text-text mt-0.5">{values.dateFrom}</p>
            </div>
            {hasAsset && values.requestType !== "assignable" && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Expected Return</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-status-outofservice-bg" />
                  <p className="font-medium text-status-outofservice-bg">{values.dateTo}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Additional Details ─────────────────────────────────────────── */}
      <section aria-label="Request purpose">
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">Purpose</p>
          <p className="text-sm font-medium text-text mt-0.5">
            {values.purpose}
          </p>
        </div>
      </section>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      {values.notes && (
        <section aria-label="Additional notes">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-text-secondary mb-1">Notes</p>
            <p className="text-sm text-text">{values.notes}</p>
          </div>
        </section>
      )}

      <p className="text-xs text-text-secondary text-center max-w-sm mx-auto">
        By submitting, your request will be sent to the Property Custodian / Department Head for review.
      </p>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

interface NewBorrowRequestWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledItems?: BrowseItem[];
  initialType?: "borrow" | "requisition" | null;
  onSuccess: (newRequest: PortalBorrowRequest) => void;
}

export function NewBorrowRequestWizard({
  open,
  onOpenChange,
  prefilledItems,
  initialType,
  onSuccess,
}: NewBorrowRequestWizardProps) {
  const [step, setStep] = useState<RequestWizardStep>(
    prefilledItems && prefilledItems.length > 0 ? "details" : "type"
  );
  const [values, setValues] = useState<WizardFormValues>({
    requestType: initialType === "requisition" ? "consumable" : initialType === "borrow" ? "borrowable" : null,
    selectedItems: prefilledItems ?? [],
    dateFrom: today(),
    dateTo: nextWeek(),
    quantities: {},
    purpose: "",
    notes: "",
    requestedByName: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");

  const { mutateAsync: createRequest, isPending: isSubmittingAsset, isSuccess: isSubmittedAsset, reset: resetAsset } = useCreateBorrowRequestMutation();
  const { mutateAsync: createConsumableRequest, isPending: isSubmittingSupply, isSuccess: isSubmittedSupply, reset: resetSupply } = useCreateConsumableRequestMutation();
  const isSubmitting = isSubmittingAsset || isSubmittingSupply;
  const isSubmitted = isSubmittedAsset || isSubmittedSupply;
  const resetMutation = useCallback(() => {
    resetAsset();
    resetSupply();
  }, [resetAsset, resetSupply]);
  const { data: me } = useMeQuery();

  useEffect(() => {
    if (!open) return;
    setStep(prefilledItems && prefilledItems.length > 0 ? "details" : "type");
    setValues({
      requestType: initialType === "requisition" ? "consumable" : initialType === "borrow" ? "borrowable" : null,
      selectedItems: prefilledItems ?? [],
      dateFrom: today(),
      dateTo: nextWeek(),
      quantities: {},
      purpose: "",
      notes: "",
      requestedByName: "",
    });
    setFieldErrors({});
    setErrorMessage("");
    resetMutation();
  }, [open, prefilledItems, resetMutation, initialType]);

  const patchValues = useCallback(
    (patch: Partial<WizardFormValues>) => setValues((p) => ({ ...p, ...patch })),
    []
  );

  const canAdvanceSelect = values.selectedItems.length > 0;
  const canAdvanceType = values.requestType !== null;

  function validateDetails(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!values.dateFrom) errs.dateFrom = "Start date is required.";
    const hasAsset = values.selectedItems.some(i => i.type === "asset");
    if (hasAsset && values.requestType !== "assignable") {
      if (!values.dateTo) errs.dateTo = "End date is required.";
      else if (values.dateTo < values.dateFrom) errs.dateTo = "End date must be on or after start date.";
    }
    if (!values.purpose.trim()) errs.purpose = "Purpose is required.";
    if (!values.requestedByName.trim()) errs.requestedByName = "Requested by is required.";
    values.selectedItems.forEach((item) => {
      const q = values.quantities[item.id] || 1;
      if (q < 1) errs[`qty_${item.id}`] = "Quantity must be at least 1.";
    });
    return errs;
  }

  function handleNext() {
    if (step === "type") {
      if (!canAdvanceType) return;
      setStep("select");
    } else if (step === "select") {
      if (!canAdvanceSelect) return;
      setStep("details");
    } else if (step === "details") {
      const errs = validateDetails();
      setFieldErrors(errs);
      if (Object.keys(errs).length === 0) setStep("review");
    }
  }

  function handleBack() {
    if (step === "select") setStep("type");
    if (step === "details") setStep(prefilledItems && prefilledItems.length > 0 ? "type" : "select");
    if (step === "review") setStep("details");
    setErrorMessage("");
  }

  const toast = useToast();

  async function handleSubmit() {
    setErrorMessage("");

    try {
      const isValidUuid = (str?: string | null) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      const items = values.selectedItems.map((item) => {
        const isRealAssetUuid = item.type === "asset" && isValidUuid(item.id);
        const isRealConsumableUuid = item.type === "consumable" && isValidUuid(item.id);
        return {
          itemDescription: item.name,
          assetId: isRealAssetUuid ? item.id : undefined,
          assetCode: isRealAssetUuid ? item.assetCode : undefined,
          consumableId: isRealConsumableUuid ? item.id : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: item.category as any,
          quantity: values.quantities[item.id] || 1,
          itemType: item.type,
        };
      });

      if (!me?.id || !me.email) {
        setErrorMessage("Your profile could not be loaded. Sign in again and retry.");
        return;
      }
      if (!me.departmentId) {
        setErrorMessage(
          "This login is not linked to a department. Ask an administrator to assign one."
        );
        return;
      }

      const hasAsset = items.some((item) => item.itemType === "asset");

      if (values.requestType === "consumable") {
        const supplyLines = items.filter((item) => item.consumableId);
        if (supplyLines.length === 0) {
          setErrorMessage("Select at least one supply item before submitting.");
          return;
        }
        const created = await createConsumableRequest({
          requesterUserId: isValidUuid(me.id) ? me.id : undefined,
          requesterName: me.name,
          requesterEmail: me.email,
          departmentId: me.departmentId,
          requestedByName: values.requestedByName.trim() || me.name,
          purpose: values.purpose,
          notes: values.notes || undefined,
          lines: supplyLines.map((item) => ({
              consumableId: item.consumableId!,
              quantity: item.quantity,
            })),
        });
        toast.success(`Requisition request ${created.requestCode} submitted successfully.`);
        onSuccess({
          id: created.id,
          requestCode: created.requestCode,
          requesterName: created.requesterName,
          requesterEmail: created.requesterEmail,
          requesterPhone: created.requesterPhone,
          department: created.department,
          requestedByName: created.requestedByName,
          items: created.lines.map((line) => ({
            itemDescription: line.itemName,
            consumableId: line.consumableId,
            category: line.category,
            quantity: line.quantityRequested,
            itemType: "consumable" as const,
          })),
          purpose: created.purpose,
          requestedAt: created.requestedAt,
          expectedReturnDate: null,
          status: created.status,
          notes: created.notes,
          history: created.history.map((h) => ({
            id: h.id,
            action: h.action === "submitted" ? "submitted" : h.action,
            actor: h.actor,
            timestamp: h.timestamp,
            note: h.note,
          })),
          requestedDateFrom: created.requestedAt.slice(0, 10),
          requestedDateTo: created.requestedAt.slice(0, 10),
        });
        onOpenChange(false);
        return;
      }

      const createdRequest = await createRequest({
        requesterUserId: isValidUuid(me.id) ? me.id : undefined,
        requesterName: me.name,
        requesterEmail: me.email,
        departmentId: isValidUuid(me.departmentId) ? me.departmentId : undefined,
        requestType:
          values.requestType === "assignable"
            ? "assignable"
            : "borrowable",
        items: items
          .filter((item) => item.itemType === "asset")
          .map((item) => ({
            itemDescription: item.itemDescription,
            assetId: item.assetId,
            assetCode: item.assetCode,
            category: item.category,
            quantity: item.quantity,
            itemType: "asset" as const,
          })),
        purpose: values.purpose,
        expectedReturnDate:
          hasAsset && values.requestType !== "assignable"
            ? values.dateTo
            : undefined,
        notes: values.notes || undefined,
        requestedByName: values.requestedByName.trim() || me.name,
      });

      toast.success(
        `Borrow request ${createdRequest.requestCode} submitted successfully.`
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSuccess(createdRequest as any);
      onOpenChange(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErrorMessage(formatFriendlyErrorMessage(e.message));
    }
  }

  if (!open) return null;

  const headerTitle =
    values.requestType === "consumable" || initialType === "requisition"
      ? "New Requisition Request"
      : values.requestType === "borrowable" || values.requestType === "assignable" || initialType === "borrow"
      ? "New Borrow Request"
      : "New Requests";

  const categoryBadgeLabel =
    values.requestType === "consumable"
      ? "Requisition"
      : values.requestType === "borrowable" || values.requestType === "assignable"
      ? "Borrow Request"
      : "Portal";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSubmitting && onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-3xl h-170 max-h-[92vh] rounded-xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header with Milestone Stepper */}
        <div className="px-6 py-4.5 border-b border-border bg-card shrink-0 space-y-3.5">
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
                Complete the milestones below to submit your request for custodian review.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              aria-label="Close wizard"
              className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Milestone Stepper */}
          <div className="pt-1">
            <MilestoneStepIndicator current={step} requestType={values.requestType} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "type" && (
            <StepType
              value={values.requestType}
              onChange={(type) => {
                patchValues({ requestType: type, selectedItems: [] }); // Reset items if type changes
              }}
            />
          )}
          {step === "select" &&
            (values.requestType === "consumable" ? (
              <StepSelectConsumables
                value={values.selectedItems}
                onChange={(items) => patchValues({ selectedItems: items })}
              />
            ) : (
              <StepSelect
                value={values.selectedItems}
                onChange={(items) => patchValues({ selectedItems: items })}
                initialType={initialType}
                requestType={values.requestType}
              />
            ))}
          {step === "details" && values.selectedItems.length > 0 && (
            <StepDetails
              items={values.selectedItems}
              values={{
                requestType: values.requestType,
                dateFrom: values.dateFrom,
                dateTo: values.dateTo,
                quantities: values.quantities,
                purpose: values.purpose,
                notes: values.notes,
                requestedByName: values.requestedByName,
              }}
              onChange={patchValues}
              errors={fieldErrors}
              registeredName={me?.name}
            />
          )}
          {step === "review" && (
            <>
              <StepReview values={values} me={me} />
              {errorMessage && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-status-outofservice-bg mt-0.5" />
                  <p className="text-xs text-status-outofservice-bg dark:text-status-outofservice-text">{errorMessage}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-card shrink-0">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === "type" || isSubmitting || isSubmitted || (step === "details" && prefilledItems && prefilledItems.length > 0)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {step !== "review" ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={(step === "type" && !canAdvanceType) || (step === "select" && !canAdvanceSelect)}
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
                  <div className="h-4 w-4 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin" />
                  Submitting…
                </>
              ) : isSubmitted ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Submitted!
                </>
              ) : (
                "Submit Request"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
