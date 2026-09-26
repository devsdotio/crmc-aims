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
  FolderKanban,
  HardHat,
  Layers,
  GripVertical,
} from "lucide-react";
import { useMeQuery } from "@/features/users/client/use-users";
import { useSuppliersQuery } from "@/features/suppliers/client";
import { useDepartmentsQuery } from "@/features/departments/client";
import { useCategoriesQuery } from "@/features/categories/client/use-categories";
import { useConsumablesQuery } from "@/features/consumables/client";
import { useAssetsQuery } from "@/features/assets/client";
import { useProjectsQuery } from "@/features/projects/client";
import { useCreatePurchaseOrderMutation } from "@/features/purchase-lots/client";
import { useToast } from "@/components/providers/toast-context";
import { useConfirm } from "@/components/providers/confirm-context";
import { cn } from "@/lib/utils";
import {
  filterMoneyInput,
  filterUnsignedIntInput,
  parseMoney,
  parseUnsignedInt,
} from "@/lib/numeric-input";
import { formatPhp } from "@/components/projects/format-money";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  buildPoPurposePrefix,
  stampPoPurpose,
} from "@/lib/po-purpose";
import { summarizePurposes } from "@/lib/request-purpose";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import {
  CONSUMABLE_CLASSIFICATIONS,
  CONSUMABLE_CLASSIFICATION_LABELS,
  DEFAULT_CONSUMABLE_CLASSIFICATION,
  type ConsumableClassification,
} from "@/lib/consumable-classification";
import type { POLockedScope } from "@/app/(private)/purchase-orders/types";

interface FileNewPODialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultPoType?: POType;
  defaultPurpose?: string;
  defaultProjectId?: string;
  defaultClassification?: ConsumableClassification;
  /** When set (from a PO subpage), locks type / destination / classification. */
  lockedScope?: POLockedScope;
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

type WizardStep = "routing" | "metadata" | "items" | "purposes" | "review";

/** Purpose group — lines share one free-text justification (destination prefix stamped on submit). */
type PoPurposeGroup = {
  id: string;
  purpose: string;
  lineIds: string[];
};

function newPoPurposeGroup(purpose = ""): PoPurposeGroup {
  return { id: crypto.randomUUID(), purpose, lineIds: [] };
}

/** Distinct soft chips for multi-purpose review (cycles by group index). */
const PURPOSE_PILL_COLORS = [
  "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
  "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30",
  "bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/30",
] as const;

const STEPS: Array<{
  id: WizardStep;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "routing",
    label: "Classification",
    shortLabel: "Class",
    description: "Type & destination",
    icon: Tag,
  },
  {
    id: "metadata",
    label: "Order Info",
    shortLabel: "Order",
    description: "Number, dept & notes",
    icon: FileText,
  },
  {
    id: "items",
    label: "Line Items",
    shortLabel: "Items",
    description: "Catalog, qty & costs",
    icon: Boxes,
  },
  {
    id: "purposes",
    label: "Purpose Assignment",
    shortLabel: "Purpose",
    description: "Group lines & purposes",
    icon: Layers,
  },
  {
    id: "review",
    label: "Review",
    shortLabel: "Review",
    description: "Confirm & file",
    icon: CheckCircle2,
  },
];

let poLineRowIdSeq = 0;

function createPoLineRowId(): string {
  poLineRowIdSeq += 1;
  return `row-${poLineRowIdSeq}`;
}

function generateInitialRow(
  poType: POType = "consumable",
  isNew = false,
  classification: ConsumableClassification = DEFAULT_CONSUMABLE_CLASSIFICATION
): POLineItemForm {
  return {
    id: createPoLineRowId(),
    isNew,
    name: "",
    category: "",
    classification,
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
  defaultProjectId,
  defaultClassification,
  lockedScope,
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
  const departments = useMemo(
    () => (Array.isArray(departmentsData) ? departmentsData : []),
    [departmentsData]
  );
  const { data: suppliers = [] } = useSuppliersQuery({
    activeOnly: true,
    enabled: isOpen,
  });
  const { data: allCategories = [] } = useCategoriesQuery({ enabled: isOpen });
  const { data: consumablePage } = useConsumablesQuery({
    limit: 200,
    catalog: true,
    enabled: isOpen,
  });
  const consumables = useMemo(
    () => consumablePage?.data ?? [],
    [consumablePage?.data]
  );
  const { data: assetsList = [] } = useAssetsQuery(undefined, {
    enabled: isOpen,
  });
  const { data: projects = [] } = useProjectsQuery({ enabled: isOpen });
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== "completed"),
    [projects]
  );

  const createPOMutation = useCreatePurchaseOrderMutation();
  const toast = useToast();
  const { confirm } = useConfirm();

  const consumableCategories = useMemo(
    () => allCategories.filter((c) => c.type === "consumable"),
    [allCategories]
  );
  const assetCategories = useMemo(
    () => allCategories.filter((c) => c.type === "asset"),
    [allCategories]
  );

  const activeProjectOptions = useMemo(
    () =>
      activeProjects.map((p) => ({
        value: p.id,
        label: `${p.projectCode ? `[${p.projectCode}] ` : ""}${p.name}${p.status ? ` (${p.status})` : ""}`,
        keywords: [p.projectCode, p.status].filter(Boolean).join(" "),
      })),
    [activeProjects]
  );

  const departmentOptions = useMemo(
    () =>
      departments.map((dept) => ({
        value: dept.id,
        label: `${dept.name}${dept.code ? ` (${dept.code})` : ""}`,
        keywords: dept.code,
      })),
    [departments]
  );

  const consumableCategoryOptions = useMemo(
    () =>
      consumableCategories.map((c) => ({
        value: c.name,
        label: c.name,
      })),
    [consumableCategories]
  );

  const assetCategoryOptions = useMemo(
    () =>
      assetCategories.map((c) => ({
        value: c.name,
        label: c.name,
      })),
    [assetCategories]
  );

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: `${s.name} (${s.supplierCode})`,
        keywords: s.supplierCode,
      })),
    [suppliers]
  );

  const assignmentTypeOptions = useMemo(
    () => [
      { value: "borrowable", label: "Borrowable" },
      { value: "assignable", label: "Assignable" },
    ],
    []
  );

  const defaultConsumableCategory = consumableCategories[0]?.name ?? "General Supply";
  const defaultAssetCategory = assetCategories[0]?.name ?? "Equipment";

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("routing");

  // Step 1 states
  const [poType, setPoType] = useState<POType>("consumable");
  const [destinationKind, setDestinationKind] = useState<"department" | "project">("department");
  const [poClassification, setPoClassification] = useState<ConsumableClassification>(
    DEFAULT_CONSUMABLE_CLASSIFICATION
  );
  const [targetProjectId, setTargetProjectId] = useState("");
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === targetProjectId),
    [projects, targetProjectId]
  );
  const [poNumberMode, setPoNumberMode] = useState<"auto" | "manual">("auto");
  const [customPoNumber, setCustomPoNumber] = useState("");
  const [poDate, setPoDate] = useState(() => new Date().toISOString().split("T")[0]);
  const accountDefaultName = me?.name || me?.email || "Authorized Staff";
  const [requestedByName, setRequestedByName] = useState(accountDefaultName);
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [targetDepartmentIds, setTargetDepartmentIds] = useState<string[]>([]);
  const [purposeGroups, setPurposeGroups] = useState<PoPurposeGroup[]>(() => [
    newPoPurposeGroup(),
  ]);
  const [generalNotes, setGeneralNotes] = useState("");
  /** Kanban drag state for purpose assignment */
  const [dragLineId, setDragLineId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const isMultiPurpose = purposeGroups.length > 1;
  const primaryPurpose = purposeGroups[0]?.purpose ?? "";

  const catalogCategoryOptions = useMemo(() => {
    const cats = poType === "asset" ? assetCategoryOptions : consumableCategoryOptions;
    return [{ value: "all", label: "All Categories" }, ...cats];
  }, [poType, assetCategoryOptions, consumableCategoryOptions]);

  const itemCategoryOptions = useMemo(
    () => (poType === "asset" ? assetCategoryOptions : consumableCategoryOptions),
    [poType, assetCategoryOptions, consumableCategoryOptions]
  );

  const effectiveClassification: ConsumableClassification =
    destinationKind === "project" ? "material" : poClassification;

  // Step 2 Line items & catalog quick-add states
  const [items, setItems] = useState<POLineItemForm[]>([
    generateInitialRow(
      "consumable",
      false,
      defaultProjectId ? "material" : DEFAULT_CONSUMABLE_CLASSIFICATION
    ),
  ]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("all");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const isProj = Boolean(defaultProjectId) || lockedScope === "project";
    const initialType: POType =
      lockedScope === "asset"
        ? "asset"
        : lockedScope === "supply" ||
          lockedScope === "material" ||
          lockedScope === "project"
        ? "consumable"
        : isProj
        ? "consumable"
        : defaultPoType || "consumable";
    const initialClassification: ConsumableClassification =
      lockedScope === "supply"
        ? "supply"
        : lockedScope === "material" || lockedScope === "project" || isProj
        ? "material"
        : defaultClassification || DEFAULT_CONSUMABLE_CLASSIFICATION;
    const initialDestination: "department" | "project" =
      lockedScope === "project" || isProj ? "project" : "department";

    setCurrentStep("routing");
    setPoType(initialType);
    setDestinationKind(initialDestination);
    setPoClassification(initialClassification);
    setTargetProjectId(defaultProjectId || "");
    setPoNumberMode("auto");
    setCustomPoNumber("");
    setPoDate(new Date().toISOString().split("T")[0]);
    setRequestedByName(me?.name || me?.email || "Authorized Staff");
    setItems([generateInitialRow(initialType, false, initialClassification)]);
    setCatalogSearch("");
    setCatalogCategoryFilter("all");
    setErrorMessage(null);

    const matchedProj = defaultProjectId
      ? projects.find((p) => p.id === defaultProjectId)
      : null;
    const matchedDept = matchedProj?.department
      ? departments.find(
          (d) =>
            d.id === matchedProj.department ||
            d.name.toLowerCase() === matchedProj.department?.toLowerCase() ||
            (d.code &&
              d.code.toLowerCase() === matchedProj.department?.toLowerCase())
        )
      : null;
    setTargetDepartmentId(matchedDept?.id || me?.departmentId || "");
    setTargetDepartmentIds(
      matchedDept?.id
        ? [matchedDept.id]
        : me?.departmentId
          ? [me.departmentId]
          : []
    );
    setGeneralNotes("");
    setPurposeGroups([newPoPurposeGroup(defaultPurpose || "")]);
    setDragLineId(null);
    setDropTargetId(null);
    // Reset only when the dialog opens (or open-relevant props change).
    // Do not depend on `projects` / `departments` arrays — query defaults like
    // `data ?? []` are new references every render and cause update-depth loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-gate
  }, [
    isOpen,
    me?.departmentId,
    me?.name,
    me?.email,
    defaultPoType,
    defaultPurpose,
    defaultProjectId,
    defaultClassification,
    lockedScope,
  ]);

  const isScopeLocked = Boolean(lockedScope);
  const isTypeLocked =
    lockedScope === "asset" ||
    lockedScope === "supply" ||
    lockedScope === "material" ||
    lockedScope === "project";
  const isDestinationLocked =
    lockedScope === "supply" ||
    lockedScope === "material" ||
    lockedScope === "asset" ||
    lockedScope === "project";
  const isClassificationLocked =
    lockedScope === "supply" ||
    lockedScope === "material" ||
    lockedScope === "project";

  // Safe Close Guard to prevent accidental data loss
  const handleSafeClose = async () => {
    if (isSubmitting) return;
    const hasData =
      Boolean(customPoNumber.trim()) ||
      purposeGroups.some((g) => Boolean(g.purpose.trim()) || g.lineIds.length > 0) ||
      Boolean(generalNotes.trim()) ||
      Boolean(targetDepartmentId.trim() && targetDepartmentId !== (me?.departmentId || "")) ||
      targetDepartmentIds.some((id) => id !== (me?.departmentId || "")) ||
      items.some((i) => Boolean(i.name.trim()) || Boolean(i.consumableId) || Boolean(i.assetId));

    if (hasData) {
      const confirmed = await confirm({
        title: "Discard this Purchase Order?",
        description:
          "You have unsaved changes. Closing will discard all entered details and line items and cannot be undone.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
        variant: "destructive",
      });
      if (!confirmed) return;
    }
    onClose();
  };

  // Handle change of PO Type in Step 1 (resets items accordingly)
  const handlePoTypeChange = (newType: POType) => {
    if (isTypeLocked) return;
    if (newType === poType) return;
    if (destinationKind === "project" && newType === "asset") {
      setErrorMessage(
        "Direct project procurement supports consumable materials only. Switch destination to Warehouse Inventory to file an asset PO."
      );
      return;
    }
    setErrorMessage(null);
    setPoType(newType);
    setCatalogSearch("");
    setCatalogCategoryFilter("all");
    const classification =
      newType === "asset"
        ? DEFAULT_CONSUMABLE_CLASSIFICATION
        : effectiveClassification;
    setItems([generateInitialRow(newType, false, classification)]);
  };

  const handleDestinationKindChange = (newKind: "department" | "project") => {
    if (isDestinationLocked) return;
    if (newKind === destinationKind) return;
    setDestinationKind(newKind);
    setErrorMessage(null);
    if (newKind === "project") {
      setPoType("consumable");
      setCatalogSearch("");
      setCatalogCategoryFilter("all");
      setItems([generateInitialRow("consumable", false, "material")]);
      if (targetDepartmentId) {
        setTargetDepartmentIds((prev) =>
          prev.includes(targetDepartmentId) ? prev : [targetDepartmentId, ...prev]
        );
      }
    } else {
      setTargetProjectId("");
      if (targetDepartmentIds.length > 0) {
        setTargetDepartmentId(targetDepartmentIds[0]);
      }
      if (poType === "asset") {
        setItems([generateInitialRow("asset", false, poClassification)]);
      } else {
        setItems((prev) =>
          prev.map((it) => ({
            ...it,
            classification: poClassification,
          }))
        );
      }
    }
  };

  const handlePoClassificationChange = (next: ConsumableClassification) => {
    if (isClassificationLocked || destinationKind === "project") return;
    if (next === poClassification) return;
    setPoClassification(next);
    setCatalogSearch("");
    setItems([generateInitialRow(poType, false, next)]);
  };

  const handleAddItem = (isNew = false) => {
    const newRow = generateInitialRow(poType, isNew, effectiveClassification);
    if (isNew) {
      newRow.category = poType === "asset" ? defaultAssetCategory : defaultConsumableCategory;
    }
    setItems((prev) => [...prev, newRow]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setItems([generateInitialRow(poType, false, effectiveClassification)]);
      toast.info("Cleared line item inputs");
    }
  };

  const handleClearCatalogItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((it) => it.id !== id));
    } else {
      setItems([generateInitialRow(poType, false, effectiveClassification)]);
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
          classification: effectiveClassification,
          unit: poType === "asset" ? "unit" : "pcs",
        };
      })
    );
  };

  const matchExistingCatalogByName = (rawName: string) => {
    const needle = rawName.trim().toLowerCase();
    if (!needle) return null;
    if (poType === "asset") {
      return (
        assetsList.find(
          (a) =>
            a.name.trim().toLowerCase() === needle ||
            a.assetCode.trim().toLowerCase() === needle
        ) ?? null
      );
    }
    return (
      consumables.find(
        (c) =>
          ((c.classification as ConsumableClassification | undefined) ??
            DEFAULT_CONSUMABLE_CLASSIFICATION) === effectiveClassification &&
          (c.name.trim().toLowerCase() === needle ||
            c.itemCode.trim().toLowerCase() === needle)
      ) ?? null
    );
  };

  const handleNewItemNameBlur = (rowId: string, rawName: string) => {
    const matched = matchExistingCatalogByName(rawName);
    if (!matched) return;

    if (poType === "asset" && "assetCode" in matched) {
      const alreadyOnPo = items.some(
        (it) => !it.isNew && it.assetId === matched.id && it.id !== rowId
      );
      if (alreadyOnPo) {
        setItems((prev) => prev.filter((it) => it.id !== rowId));
        toast.info(`"${matched.name}" is already on this PO.`);
        return;
      }
      setItems((prev) =>
        prev.map((it) =>
          it.id === rowId
            ? {
                ...it,
                isNew: false,
                assetId: matched.id,
                consumableId: undefined,
                name: matched.name,
                category: matched.category,
                assignmentType: matched.assignmentType || "borrowable",
                location: matched.location || "Property Custodian Depot",
                unit: "unit",
              }
            : it
        )
      );
      toast.info(
        `"${matched.name}" already exists in the catalog — linked as existing stock.`
      );
      return;
    }

    if (poType === "consumable" && "itemCode" in matched) {
      const alreadyOnPo = items.some(
        (it) => !it.isNew && it.consumableId === matched.id && it.id !== rowId
      );
      if (alreadyOnPo) {
        setItems((prev) => prev.filter((it) => it.id !== rowId));
        toast.info(`"${matched.name}" is already on this PO.`);
        return;
      }
      setItems((prev) =>
        prev.map((it) =>
          it.id === rowId
            ? {
                ...it,
                isNew: false,
                consumableId: matched.id,
                assetId: undefined,
                name: matched.name,
                category: matched.category,
                classification: effectiveClassification,
                unit: matched.unit || "pcs",
                minThreshold: matched.minThreshold || 5,
                location: matched.location || "Main Property Storage",
                suggestedDealer: matched.supplier || it.suggestedDealer,
              }
            : it
        )
      );
      toast.info(
        `"${matched.name}" already exists in the catalog — linked as existing stock.`
      );
    }
  };

  // Quick-Add & Quick-Unselect from Catalog Cards
  const handleQuickAddConsumable = (c: (typeof consumables)[number]) => {
    const itemClass =
      (c.classification as ConsumableClassification | undefined) ??
      DEFAULT_CONSUMABLE_CLASSIFICATION;
    if (itemClass !== effectiveClassification) {
      toast.error(
        `"${c.name}" is ${CONSUMABLE_CLASSIFICATION_LABELS[itemClass]}. This PO is locked to ${CONSUMABLE_CLASSIFICATION_LABELS[effectiveClassification]}.`
      );
      return;
    }

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
        setItems([generateInitialRow(poType, false, effectiveClassification)]);
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
      classification: effectiveClassification,
      unit: c.unit || "pcs",
      minThreshold: c.minThreshold || 5,
      location: c.location || "Main Property Storage",
      assignmentType: "borrowable",
      model: "",
      quantity: "1",
      unitCost: "",
      suggestedDealer: c.supplier || matchedSup?.name || "",
      supplierId: matchedSup?.id,
      purpose: "",
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
        setItems([generateInitialRow(poType, false, effectiveClassification)]);
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
      classification: effectiveClassification,
      unit: "unit",
      minThreshold: 5,
      location: a.location || "Main Property Storage",
      assignmentType: a.assignmentType || "borrowable",
      model: a.modelId || "",
      quantity: "1",
      unitCost: a.value ? String(a.value) : "",
      suggestedDealer: "",
      supplierId: undefined,
      purpose: "",
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
    const matchedClassification =
      (matched.classification as ConsumableClassification | undefined) ??
      DEFAULT_CONSUMABLE_CLASSIFICATION;
    if (matchedClassification !== effectiveClassification) {
      toast.error(
        `"${matched.name}" is classified as ${CONSUMABLE_CLASSIFICATION_LABELS[matchedClassification]}. This PO is locked to ${CONSUMABLE_CLASSIFICATION_LABELS[effectiveClassification]}.`
      );
      return;
    }
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
          classification: effectiveClassification,
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
      const itemClass =
        (c.classification as ConsumableClassification | undefined) ??
        DEFAULT_CONSUMABLE_CLASSIFICATION;
      if (itemClass !== effectiveClassification) return false;

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
  }, [
    consumables,
    catalogSearch,
    catalogCategoryFilter,
    effectiveClassification,
  ]);

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

  // Step 1 — classification / destination
  const validateRouting = (): boolean => {
    setErrorMessage(null);
    if (destinationKind === "project") {
      if (poType !== "consumable") {
        setErrorMessage(
          "Direct project procurement supports consumable materials only."
        );
        return false;
      }
      if (!targetProjectId.trim()) {
        setErrorMessage("Please select a target project for this Project Purchase Order.");
        return false;
      }
    }
    if (poType === "consumable" && destinationKind === "department" && !poClassification) {
      setErrorMessage("Select whether this PO is for Supplies or Materials.");
      return false;
    }
    return true;
  };

  // Step 2 — order metadata
  const validateMetadata = (): boolean => {
    setErrorMessage(null);
    if (poNumberMode === "manual" && !customPoNumber.trim()) {
      setErrorMessage("Please enter a manual PO Number or switch to Auto-generate.");
      return false;
    }
    if (!poDate) {
      setErrorMessage("Order date is required.");
      return false;
    }
    if (!requestedByName.trim()) {
      setErrorMessage("Requested By is required.");
      return false;
    }
    if (targetDepartmentIds.length < 1) {
      setErrorMessage("Select at least one target department.");
      return false;
    }
    return true;
  };

  // Step 3 — line items
  const validateItems = (): boolean => {
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

  // Step 4 — purpose assignment
  const validatePurposes = (): boolean => {
    setErrorMessage(null);
    if (purposeGroups.length < 1) {
      setErrorMessage("Add at least one purpose group.");
      return false;
    }
    for (let i = 0; i < purposeGroups.length; i++) {
      if (!purposeGroups[i].purpose.trim()) {
        setErrorMessage(
          purposeGroups.length === 1
            ? "Procurement purpose is required."
            : `Purpose ${i + 1} text is required.`
        );
        return false;
      }
    }
    const assigned = new Set(purposeGroups.flatMap((g) => g.lineIds));
    const namedItems = items.filter((it) => it.name.trim());
    const unassigned = namedItems.filter((it) => !assigned.has(it.id));
    if (unassigned.length > 0) {
      setErrorMessage(
        `Assign every line item to a purpose (${unassigned.length} unassigned).`
      );
      return false;
    }
    for (let i = 0; i < purposeGroups.length; i++) {
      if (purposeGroups[i].lineIds.length === 0) {
        setErrorMessage(`Purpose ${i + 1} needs at least one line item.`);
        return false;
      }
    }
    return true;
  };

  const seedPurposeGroupLines = (groups: PoPurposeGroup[], lineItems: POLineItemForm[]) => {
    const ids = lineItems.map((it) => it.id);
    if (groups.length === 1) {
      return [{ ...groups[0], lineIds: ids }];
    }
    // Keep existing assignments; drop stale ids
    const idSet = new Set(ids);
    const pruned = groups.map((g) => ({
      ...g,
      lineIds: g.lineIds.filter((id) => idSet.has(id)),
    }));
    // Heuristic: if nothing assigned yet, put all lines in Purpose 1
    const anyAssigned = pruned.some((g) => g.lineIds.length > 0);
    if (!anyAssigned && pruned.length > 0) {
      return pruned.map((g, idx) =>
        idx === 0 ? { ...g, lineIds: ids } : g
      );
    }
    return pruned;
  };

  const assignLineToPurpose = (groupId: string, lineId: string) => {
    setPurposeGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          if (g.lineIds.includes(lineId)) return g;
          return { ...g, lineIds: [...g.lineIds, lineId] };
        }
        return { ...g, lineIds: g.lineIds.filter((id) => id !== lineId) };
      })
    );
  };

  /** Remove a purpose column; its lines move to the first remaining purpose. */
  const removePurposeGroup = (groupId: string) => {
    setPurposeGroups((prev) => {
      if (prev.length <= 1) return prev;
      const removing = prev.find((g) => g.id === groupId);
      const kept = prev.filter((g) => g.id !== groupId);
      if (!removing || kept.length === 0) return prev;
      const orphanIds = removing.lineIds;
      if (orphanIds.length === 0) return kept;
      return kept.map((g, idx) =>
        idx === 0
          ? {
              ...g,
              lineIds: [
                ...g.lineIds,
                ...orphanIds.filter((id) => !g.lineIds.includes(id)),
              ],
            }
          : g
      );
    });
  };

  const clearKanbanDrag = () => {
    setDragLineId(null);
    setDropTargetId(null);
  };

  const canJumpToStep = (target: WizardStep): boolean => {
    const targetIdx = STEPS.findIndex((s) => s.id === target);
    if (targetIdx <= 0) return true;
    if (targetIdx >= 1 && !validateRouting()) return false;
    if (targetIdx >= 2 && !validateMetadata()) return false;
    if (targetIdx >= 3 && !validateItems()) return false;
    if (targetIdx >= 4 && !validatePurposes()) return false;
    return true;
  };

  const handleNextFromRouting = () => {
    if (validateRouting()) setCurrentStep("metadata");
  };

  const handleNextFromMetadata = () => {
    if (validateMetadata()) setCurrentStep("items");
  };

  const handleNextFromItems = () => {
    if (!validateItems()) return;
    setPurposeGroups((prev) => seedPurposeGroupLines(prev, items));
    setCurrentStep("purposes");
  };

  const handleNextFromPurposes = () => {
    if (validatePurposes()) setCurrentStep("review");
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (currentStep === "review") setCurrentStep("purposes");
    else if (currentStep === "purposes") setCurrentStep("items");
    else if (currentStep === "items") setCurrentStep("metadata");
    else if (currentStep === "metadata") setCurrentStep("routing");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (
      !validateRouting() ||
      !validateMetadata() ||
      !validateItems() ||
      !validatePurposes()
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedProjectObj =
        destinationKind === "project"
          ? projects.find((p) => p.id === targetProjectId)
          : null;

      const selectedDepartmentIds = targetDepartmentIds;
      const selectedDepartments = selectedDepartmentIds
        .map((id) => departments.find((d) => d.id === id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d));
      const primaryDepartment = selectedDepartments[0];
      const departmentName = primaryDepartment?.name?.trim() || "";
      const departmentLabel = selectedDepartments
        .map((d) => d.name.trim())
        .filter(Boolean)
        .join(", ");
      if (!departmentName || selectedDepartments.length < 1) {
        setErrorMessage("Please select a valid target department.");
        return;
      }

      const purposePrefix = buildPoPurposePrefix({
        departmentLabel,
        projectLabel:
          destinationKind === "project" && selectedProjectObj
            ? selectedProjectObj.projectCode || selectedProjectObj.name
            : null,
      });

      // Ensure single-purpose binds all lines; resolve purpose per line from groups
      const groupsForSubmit = seedPurposeGroupLines(purposeGroups, items);
      const purposeByLineId = new Map<string, string>();
      for (const g of groupsForSubmit) {
        const stamped = stampPoPurpose(purposePrefix, g.purpose);
        for (const lineId of g.lineIds) {
          purposeByLineId.set(lineId, stamped);
        }
      }
      const justifications = groupsForSubmit.map((g) => g.purpose.trim());
      const headerPurpose = stampPoPurpose(
        purposePrefix,
        summarizePurposes(justifications)
      );
      if (!headerPurpose) {
        setErrorMessage("Procurement purpose is required.");
        return;
      }

      const formattedItems = items.map((item) => {
        const isAsset = poType === "asset";
        const qty = parseUnsignedInt(item.quantity, 1);
        const unitCostNum = parseMoney(item.unitCost) ?? 0;
        const linePurpose =
          purposeByLineId.get(item.id) ||
          stampPoPurpose(purposePrefix, primaryPurpose);

        return {
          itemType: poType,
          consumableId: !item.isNew && !isAsset ? item.consumableId : undefined,
          assetId: !item.isNew && isAsset ? item.assetId : undefined,
          isNewItem: item.isNew,
          name: item.name.trim(),
          category: item.category.trim() || (isAsset ? defaultAssetCategory : defaultConsumableCategory),
          classification: !isAsset ? effectiveClassification : undefined,
          unit: item.unit || (isAsset ? "unit" : "pcs"),
          minThreshold: item.minThreshold || 5,
          location: item.location || "Main Property Storage",
          assignmentType: item.assignmentType || "borrowable",
          model: item.model || undefined,
          quantity: qty,
          unitCost: unitCostNum,
          purpose: linePurpose,
          suggestedDealer: item.suggestedDealer || undefined,
          supplierId: item.supplierId || undefined,
          projectId: destinationKind === "project" ? targetProjectId : undefined,
          projectName: destinationKind === "project" ? selectedProjectObj?.name : undefined,
        };
      });

      if (formattedItems.some((it) => !it.purpose.trim())) {
        setErrorMessage("Procurement purpose is required for every line item.");
        return;
      }

      const uniqueSuppliers = Array.from(
        new Set(items.map((it) => it.suggestedDealer?.trim()).filter(Boolean))
      );
      // Only set a PO-level supplier when every line shares one vendor.
      // Never send "Multiple Suppliers" — each lot stores its own line dealer.
      const masterSupplierName =
        uniqueSuppliers.length === 1 ? uniqueSuppliers[0] : undefined;
      const masterSupplierId =
        uniqueSuppliers.length === 1 ? items[0]?.supplierId : undefined;

      await createPOMutation.mutateAsync({
        poNumber: poNumberMode === "manual" ? customPoNumber.trim() : undefined,
        poDate,
        requestedBy: requestedByName.trim() || accountDefaultName,
        supplierId: masterSupplierId,
        supplierName: masterSupplierName,
        departmentId: primaryDepartment.id,
        departmentName,
        departmentIds: selectedDepartments.map((d) => d.id),
        projectId: destinationKind === "project" ? targetProjectId : undefined,
        projectName: destinationKind === "project" ? (selectedProjectObj?.name || undefined) : undefined,
        purpose: headerPurpose,
        notes: generalNotes.trim() || undefined,
        status: "pending_approval",
        items: formattedItems,
      });

      toast.success(
        `${destinationKind === "project" ? "Project " : ""}${poType === "asset" ? "Asset" : "Consumable"} Purchase Order filed successfully with ${items.length} item(s).`
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
        className="relative w-full max-w-3xl h-[78vh] max-h-180 min-h-120 rounded-2xl border border-border bg-bg shadow-2xl z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header + stepper */}
        <div className="shrink-0 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-3 pb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent shrink-0">
                <FilePlus2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2
                  id="new-po-title"
                  className="text-sm font-bold text-text truncate"
                >
                  File New Purchase Order
                </h2>
                <p className="text-[10px] text-text-secondary truncate">
                  {STEPS[currentStepIdx]?.label}
                  <span className="text-text-secondary/80">
                    {" "}
                    — {STEPS[currentStepIdx]?.description}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSafeClose()}
              aria-label="Close dialog"
              className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-border/60 transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav
            aria-label="Purchase order steps"
            className="flex items-center gap-2 px-4 sm:px-5 pb-2.5 min-w-0"
          >
            <span className="shrink-0 inline-flex items-center rounded-md bg-accent/10 border border-accent/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent tabular-nums">
              {currentStepIdx + 1}/{STEPS.length}
            </span>

            <ol className="flex items-center flex-1 min-w-0 gap-0">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isPassed = currentStepIdx > idx;
                const isCurrent = currentStepIdx === idx;
                const isLast = idx === STEPS.length - 1;

                return (
                  <li
                    key={step.id}
                    className={cn(
                      "flex items-center min-w-0",
                      isLast ? "shrink-0" : "flex-1"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (idx <= currentStepIdx) {
                          setErrorMessage(null);
                          setCurrentStep(step.id);
                          return;
                        }
                        if (canJumpToStep(step.id)) setCurrentStep(step.id);
                      }}
                      aria-current={isCurrent ? "step" : undefined}
                      title={`${step.label} — ${step.description}`}
                      className={cn(
                        "group inline-flex items-center gap-1 rounded-full pl-0.5 pr-1 sm:pr-1.5 py-0.5 cursor-pointer transition-all duration-200",
                        isCurrent
                          ? "bg-accent/10 ring-1 ring-accent/25"
                          : "hover:bg-bg/80"
                      )}
                    >
                      <span
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center border-2 shrink-0 transition-all duration-200",
                          isPassed
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : isCurrent
                              ? "bg-accent text-accent-foreground border-accent"
                              : "bg-bg text-text-secondary border-border group-hover:border-accent/40"
                        )}
                      >
                        {isPassed ? (
                          <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                        ) : (
                          <Icon className="h-2.5 w-2.5" />
                        )}
                      </span>
                      <span
                        className={cn(
                          "hidden md:inline text-[10px] font-semibold leading-none whitespace-nowrap",
                          isCurrent ? "text-text" : "text-text-secondary"
                        )}
                      >
                        {step.shortLabel}
                      </span>
                    </button>

                    {!isLast && (
                      <div
                        className="flex-1 mx-0.5 sm:mx-1 h-0.5 rounded-full bg-border overflow-hidden min-w-1"
                        aria-hidden="true"
                      >
                        <div
                          className={cn(
                            "h-full rounded-full bg-accent transition-all duration-300 ease-out",
                            isPassed ? "w-full" : "w-0"
                          )}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Form Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 text-status-outofservice-text flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* ================= STEP 1: CLASSIFICATION & DESTINATION ================= */}
          {currentStep === "routing" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {isScopeLocked && (
                <div className="p-3 rounded-xl border border-accent/30 bg-accent/10 text-text flex items-start gap-2.5 shadow-2xs">
                  <Lock className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
                  <div>
                    <span className="font-bold text-xs block">
                      Scoped from{" "}
                      {lockedScope === "supply"
                        ? "Supplies"
                        : lockedScope === "material"
                        ? "Materials"
                        : lockedScope === "asset"
                        ? "Assets"
                        : "Projects"}{" "}
                      page
                    </span>
                    <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                      {lockedScope === "supply"
                        ? "This PO will stock warehouse Consumable Supplies. Type and classification are locked."
                        : lockedScope === "material"
                        ? "This PO will stock warehouse Consumable Materials. Type and classification are locked."
                        : lockedScope === "asset"
                        ? "This PO will register fixed assets in inventory. Item type is locked."
                        : "This PO will credit project materials on delivery (not warehouse stock). Destination and classification are locked."}
                    </p>
                  </div>
                </div>
              )}

              {/* 1. What are you buying? */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-bold text-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-accent" />
                    1. What are you buying?
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    {isTypeLocked
                      ? "Locked by page scope"
                      : "All items in this PO will be of this type"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePoTypeChange("consumable")}
                    disabled={isTypeLocked && poType !== "consumable"}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex items-start gap-2.5",
                      isTypeLocked && poType !== "consumable"
                        ? "opacity-40 cursor-not-allowed"
                        : "cursor-pointer",
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
                        <span className="font-bold text-xs text-text">Consumables</span>
                        {poType === "consumable" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                        Supplies or materials tracked by quantity — office stock, lab items, and recurring batches.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePoTypeChange("asset")}
                    disabled={
                      (isTypeLocked && poType !== "asset") ||
                      destinationKind === "project"
                    }
                    title={
                      destinationKind === "project"
                        ? "Project POs support consumable materials only"
                        : isTypeLocked
                        ? "Locked by page scope"
                        : undefined
                    }
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex items-start gap-2.5",
                      (isTypeLocked && poType !== "asset") ||
                        destinationKind === "project"
                        ? "opacity-50 cursor-not-allowed border-border bg-bg-subtle/40"
                        : "cursor-pointer",
                      poType === "asset" &&
                        destinationKind !== "project" &&
                        !(isTypeLocked && poType !== "asset")
                        ? "border-blue-500/60 bg-blue-500/10 shadow-xs ring-2 ring-blue-500/20"
                        : destinationKind !== "project" &&
                          !(isTypeLocked && poType !== "asset")
                        ? "border-border bg-card hover:bg-bg-subtle/50 hover:border-border"
                        : ""
                    )}
                  >
                    <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                      <Laptop className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-text">Fixed Assets & Equipment</span>
                        {poType === "asset" && destinationKind !== "project" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                        {destinationKind === "project"
                          ? "Not available for direct project procurement. Use Warehouse Inventory for asset POs."
                          : "Laptops, projectors, machinery, lab equipment, and trackable institutional assets."}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Destination */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-bold text-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FolderKanban className="h-3.5 w-3.5 text-accent" />
                    2. Where does it go?
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    Inventory tracking vs project credit
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleDestinationKindChange("department")}
                    disabled={isDestinationLocked && destinationKind !== "department"}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex items-start gap-2.5",
                      isDestinationLocked && destinationKind !== "department"
                        ? "opacity-40 cursor-not-allowed"
                        : "cursor-pointer",
                      destinationKind === "department"
                        ? "border-accent/60 bg-accent/10 shadow-xs ring-2 ring-accent/20"
                        : "border-border bg-card hover:bg-bg-subtle/50 hover:border-border"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-accent/15 text-accent mt-0.5 shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-text">Warehouse Inventory</span>
                        {destinationKind === "department" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                        On delivery, items enter warehouse stock for tracking (FIFO lots for consumables). Available for department requisitions.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDestinationKindChange("project")}
                    disabled={isDestinationLocked && destinationKind !== "project"}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex items-start gap-2.5",
                      isDestinationLocked && destinationKind !== "project"
                        ? "opacity-40 cursor-not-allowed"
                        : "cursor-pointer",
                      destinationKind === "project"
                        ? "border-amber-500/60 bg-amber-500/10 shadow-xs ring-2 ring-amber-500/20"
                        : "border-border bg-card hover:bg-bg-subtle/50 hover:border-border"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
                      <HardHat className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-text">Direct Project Procurement</span>
                        {destinationKind === "project" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                        Consumable materials only — credited to the project spend ledger on delivery. Does not enter warehouse stock.
                      </p>
                    </div>
                  </button>
                </div>

                {destinationKind === "project" && (
                  <div className="pt-2 border-t border-border space-y-1.5 animate-in fade-in duration-150">
                    <label className="font-semibold text-text flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <FolderKanban className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Select Target Project</span>
                      </span>
                      <span className="text-[10px] text-rose-500 font-bold">* Required for Project PO</span>
                    </label>
                    <SearchableSelect
                      value={targetProjectId}
                      onValueChange={(projId) => {
                        setTargetProjectId(projId);
                        const matched = projects.find((p) => p.id === projId);
                        const matchedDept = matched?.department
                          ? departments.find(
                              (d) =>
                                d.id === matched.department ||
                                d.name.toLowerCase() === matched.department?.toLowerCase() ||
                                (d.code && d.code.toLowerCase() === matched.department?.toLowerCase())
                            )
                          : null;
                        if (matchedDept?.id) {
                          setTargetDepartmentId(matchedDept.id);
                          setTargetDepartmentIds((prev) =>
                            prev.includes(matchedDept.id)
                              ? prev
                              : [...prev, matchedDept.id]
                          );
                        }
                      }}
                      options={activeProjectOptions}
                      clearLabel="-- Choose Active Project --"
                      placeholder="-- Choose Active Project --"
                      emptyMessage="No active projects available"
                      inputClassName="focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    {selectedProject && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-between text-[11px]">
                        <span>
                          Direct allocation to <strong>{selectedProject.name}</strong> ({selectedProject.projectCode})
                        </span>
                        <span className="font-mono font-bold">
                          Budget: {formatPhp(Number(selectedProject.budget) || 0)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Supplies vs Materials (warehouse consumables only) */}
              {poType === "consumable" && destinationKind === "department" && (
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5 shadow-2xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-bold text-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Boxes className="h-3.5 w-3.5 text-accent" />
                      3. Consumable classification
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {isClassificationLocked
                        ? "Locked by page scope"
                        : "Locks this PO and filters the catalog"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CONSUMABLE_CLASSIFICATIONS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handlePoClassificationChange(id)}
                        disabled={isClassificationLocked && poClassification !== id}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all flex items-start gap-2.5",
                          isClassificationLocked && poClassification !== id
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer",
                          poClassification === id
                            ? id === "supply"
                              ? "border-emerald-500/60 bg-emerald-500/10 shadow-xs ring-2 ring-emerald-500/20"
                              : "border-violet-500/60 bg-violet-500/10 shadow-xs ring-2 ring-violet-500/20"
                            : "border-border bg-card hover:bg-bg-subtle/50 hover:border-border"
                        )}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-lg mt-0.5 shrink-0",
                            id === "supply"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                          )}
                        >
                          {id === "supply" ? (
                            <Boxes className="h-5 w-5" />
                          ) : (
                            <HardHat className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-text">
                              {CONSUMABLE_CLASSIFICATION_LABELS[id]}
                            </span>
                            {poClassification === id && (
                              <CheckCircle2
                                className={cn(
                                  "h-3.5 w-3.5",
                                  id === "supply"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-violet-600 dark:text-violet-400"
                                )}
                              />
                            )}
                          </div>
                          <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                            {id === "supply"
                              ? "Office supplies, stationery, and recurring warehouse stock (Supplies inventory)."
                              : "Construction / operational materials held in Materials inventory until issued."}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {poType === "consumable" && destinationKind === "project" && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-2.5 shadow-2xs">
                  <HardHat className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-bold text-xs block">Classification locked: Consumable Materials</span>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                      Project POs always use materials and credit the project on delivery — they are not stocked in the warehouse.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: ORDER METADATA ================= */}
          {currentStep === "metadata" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-bold text-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-accent" />
                    Order Metadata & Authorization
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
                    <div className="flex items-center justify-between text-xs text-text-secondary bg-bg px-3 py-2 rounded-lg border border-dashed border-border gap-3 flex-wrap">
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

                  {/* Requested By */}
                  <div className="space-y-1">
                    <label className="font-semibold text-text flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-accent" />
                      <span>Requested By</span>
                    </label>
                    <input
                      type="text"
                      value={requestedByName}
                      onChange={(e) => setRequestedByName(e.target.value)}
                      placeholder="Name of the person requesting this PO"
                      required
                      className="w-full h-9 px-3 rounded-lg border border-border bg-bg text-text text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden font-medium"
                    />
                    <p className="text-[10px] text-text-secondary">
                      Defaults to your account; edit to match the physical request form.
                    </p>
                  </div>

                  {/* Target departments — one or more for every PO type */}
                  <div className="space-y-1">
                    <label className="font-semibold text-text flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <School className="h-3.5 w-3.5 text-text-secondary" />
                        <span>
                          {destinationKind === "project"
                            ? "Sponsoring Departments"
                            : "Target Departments"}
                        </span>
                      </span>
                      <span className="text-[10px] text-rose-500 font-bold">* Required</span>
                    </label>
                    <MultiSelectDropdown
                      label="Departments"
                      icon={School}
                      variant="form"
                      searchable
                      selectedIds={targetDepartmentIds}
                      onToggle={(id) => {
                        setTargetDepartmentIds((prev) => {
                          const next = prev.includes(id)
                            ? prev.filter((x) => x !== id)
                            : [...prev, id];
                          setTargetDepartmentId(next[0] || "");
                          return next;
                        });
                      }}
                      options={departmentOptions.map((o) => ({
                        id: o.value,
                        label: o.label,
                      }))}
                      placeholder={
                        departmentsLoading
                          ? "Loading departments…"
                          : departmentsError
                            ? "Failed to load departments"
                            : "-- Choose one or more departments --"
                      }
                      emptyMessage={
                        departmentsError
                          ? "Failed to load departments"
                          : "No departments found"
                      }
                      disabled={departmentsLoading}
                      aria-required="true"
                      triggerClassName="focus:ring-accent/20 focus:border-accent disabled:opacity-60"
                    />
                    {targetDepartmentIds.length > 0 && (
                      <p className="text-[10px] text-text-secondary">
                        Primary for vouchers / purpose:{" "}
                        <span className="font-semibold text-text">
                          {departments.find((d) => d.id === targetDepartmentIds[0])
                            ?.name || "—"}
                        </span>{" "}
                        (first selected)
                      </p>
                    )}
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

                {/* Row 2: Order notes */}
                <div className="pt-2 border-t border-border/60 space-y-1">
                  <label className="font-semibold text-text flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-text-secondary" />
                    <span>Order Notes / Budget Justification</span>
                  </label>
                  <textarea
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="e.g. Approved under Semester 1 Supply Budget Allocation / Urgently required for midterm examinations..."
                    rows={4}
                    className="w-full p-2.5 rounded-lg border border-border bg-bg text-text text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden resize-none leading-relaxed min-h-24"
                  />
                  <p className="text-[10px] text-text-secondary">
                    Procurement purpose is assigned to line items in a later step.
                  </p>
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
                      {poType === "asset"
                        ? "Asset Catalog"
                        : `${CONSUMABLE_CLASSIFICATION_LABELS[effectiveClassification]} Catalog`}
                    </h3>
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
                    <SearchableSelect
                      value={catalogCategoryFilter}
                      onValueChange={setCatalogCategoryFilter}
                      options={catalogCategoryOptions}
                      placeholder="All Categories"
                      emptyMessage="No categories available"
                      inputClassName="h-8.5 px-2.5"
                    />
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

                              <div className="flex items-center justify-between text-[9px] text-text-secondary pt-0.5 border-t border-border/40 gap-1">
                                <span
                                  className={cn(
                                    "px-1 py-0.5 rounded font-bold shrink-0 border",
                                    (c.classification ?? "supply") === "material"
                                      ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25"
                                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                                  )}
                                >
                                  {(c.classification ?? "supply") === "material" ? "Mat" : "Sup"}
                                </span>
                                <span className="truncate max-w-12">{c.category}</span>
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
                        <p className="font-medium text-xs">
                          No matching {CONSUMABLE_CLASSIFICATION_LABELS[effectiveClassification].toLowerCase()} found
                        </p>
                        <p className="text-[10px]">
                          Try adjusting your search, or register a{" "}
                          <button
                            type="button"
                            onClick={() => handleAddItem(true)}
                            className="text-accent underline font-semibold cursor-pointer"
                          >
                            + Custom {effectiveClassification === "material" ? "Material" : "Supply"}
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

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                  <p className="text-[10px] text-text-secondary leading-snug">
                    Prefer catalog picks above. Use custom only when the SKU is not registered yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAddItem(true)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer shadow-2xs shrink-0",
                      poType === "asset"
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      + Custom / New{" "}
                      {poType === "asset"
                        ? "Asset"
                        : effectiveClassification === "material"
                          ? "Material"
                          : "Supply"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Bottom Section: Configured Line Items List */}
              <div className="space-y-3 pt-1">
                {destinationKind === "project" && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-2.5 animate-in fade-in duration-150 shadow-2xs">
                    <HardHat className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <span className="font-bold block">
                        Project Direct Crediting: {selectedProject ? `${selectedProject.name} (${selectedProject.projectCode})` : "Active Project"}
                      </span>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                        All line items will be classified as Project Materials and credited directly to project expenses upon delivery without entering general warehouse stock.
                      </p>
                    </div>
                  </div>
                )}

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
                                onBlur={(e) =>
                                  handleNewItemNameBlur(item.id, e.target.value)
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
                            <SearchableSelect
                              value={item.supplierId || item.suggestedDealer || ""}
                              onValueChange={(val) => {
                                const matched = suppliers.find((s) => s.id === val || s.name === val);
                                handleItemFieldChange(item.id, "supplierId", matched?.id || "");
                                handleItemFieldChange(item.id, "suggestedDealer", matched?.name || val);
                              }}
                              options={supplierOptions}
                              clearLabel="-- Direct / Default Supplier --"
                              placeholder="-- Direct / Default Supplier --"
                              emptyMessage="No suppliers available"
                              inputClassName="h-8.5 px-2.5 focus:ring-1 focus:ring-ring"
                            />
                          </div>
                        </div>

                        <div
                          className={cn(
                            "grid grid-cols-2 gap-3 pt-1 border-t border-border/40",
                            poType === "consumable"
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

                          {/* Classification (locked to PO) / Category */}
                          {poType === "consumable" && (
                            <div className="space-y-1">
                              <label className="font-semibold text-text">
                                Classification
                              </label>
                              <div
                                className={cn(
                                  "h-8.5 px-2 rounded-lg border font-semibold text-xs flex items-center gap-1.5 select-none",
                                  destinationKind === "project" || effectiveClassification === "material"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                                )}
                              >
                                {destinationKind === "project" ? (
                                  <HardHat className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <Boxes className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span className="truncate">
                                  {destinationKind === "project"
                                    ? "Material (Project)"
                                    : CONSUMABLE_CLASSIFICATION_LABELS[effectiveClassification]}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="font-semibold text-text">Category</label>
                            {item.isNew ? (
                              <SearchableSelect
                                value={item.category}
                                onValueChange={(val) =>
                                  handleItemFieldChange(item.id, "category", val)
                                }
                                options={itemCategoryOptions}
                                placeholder="Select category…"
                                emptyMessage="No categories available"
                                inputClassName="h-8.5 px-2 focus:ring-1 focus:ring-accent"
                              />
                            ) : (
                              <input
                                type="text"
                                value={item.category || (poType === "asset" ? "Equipment" : "General Supply")}
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
                                <SearchableSelect
                                  value={item.assignmentType}
                                  onValueChange={(val) =>
                                    handleItemFieldChange(item.id, "assignmentType", val)
                                  }
                                  options={assignmentTypeOptions}
                                  placeholder="Select assignment type…"
                                  inputClassName="h-8.5 px-2 focus:ring-1 focus:ring-accent"
                                />
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

          {/* ================= STEP: PURPOSE ASSIGNMENT ================= */}
          {currentStep === "purposes" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-text">
                      Purpose Assignment
                    </h3>
                    <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                      Drag line items between purpose columns. Every line stays
                      under a purpose.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPurposeGroups((prev) => [...prev, newPoPurposeGroup()])
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Add purpose
                </button>
              </div>

              {/* Kanban — purpose columns only */}
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 min-h-56">
                {purposeGroups.map((group, groupIdx) => {
                  const namedItems = items.filter((it) => it.name.trim());
                  const assignedItems = namedItems.filter((it) =>
                    group.lineIds.includes(it.id)
                  );
                  const isOver = dropTargetId === group.id;

                  return (
                    <div
                      key={group.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dropTargetId !== group.id) {
                          setDropTargetId(group.id);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) {
                          return;
                        }
                        if (dropTargetId === group.id) setDropTargetId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const lineId =
                          e.dataTransfer.getData("text/plain") || dragLineId;
                        if (lineId) assignLineToPurpose(group.id, lineId);
                        clearKanbanDrag();
                      }}
                      className={cn(
                        "w-52 sm:w-56 shrink-0 rounded-xl border bg-bg flex flex-col overflow-hidden transition-colors",
                        isOver
                          ? "border-indigo-500/50 ring-2 ring-indigo-500/20 bg-indigo-500/5"
                          : "border-border"
                      )}
                    >
                      <div className="px-2.5 py-2 border-b border-indigo-500/20 bg-indigo-500/5 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                            Purpose {groupIdx + 1} ({assignedItems.length})
                            <span className="text-rose-600 normal-case tracking-normal"> *</span>
                          </p>
                          {purposeGroups.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePurposeGroup(group.id)}
                              className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <textarea
                          value={group.purpose}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPurposeGroups((prev) =>
                              prev.map((g) =>
                                g.id === group.id
                                  ? { ...g, purpose: value }
                                  : g
                              )
                            );
                          }}
                          onDragOver={(e) => e.stopPropagation()}
                          placeholder={
                            groupIdx === 0
                              ? "Purpose — e.g. office replenishment…"
                              : "Purpose text…"
                          }
                          rows={2}
                          required
                          aria-required="true"
                          className="w-full p-1.5 rounded-md border border-border bg-bg text-[11px] focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden resize-none leading-relaxed"
                        />
                      </div>
                      <div className="p-2 space-y-1.5 flex-1 min-h-36 max-h-64 overflow-y-auto">
                        {assignedItems.length > 0 ? (
                          assignedItems.map((it) => {
                            const isDragging = dragLineId === it.id;
                            return (
                              <div
                                key={it.id}
                                draggable
                                onDragStart={(e) => {
                                  setDragLineId(it.id);
                                  e.dataTransfer.setData("text/plain", it.id);
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={clearKanbanDrag}
                                className={cn(
                                  "flex items-start gap-1.5 px-2 py-1.5 rounded-md border bg-card text-xs cursor-grab active:cursor-grabbing select-none shadow-2xs transition-opacity",
                                  isDragging
                                    ? "opacity-40 border-accent"
                                    : "border-border hover:border-accent/40"
                                )}
                              >
                                <GripVertical className="h-3.5 w-3.5 text-text-secondary shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-text truncate leading-snug">
                                    {it.name || "Untitled"}
                                  </p>
                                  <p className="text-[10px] text-text-secondary truncate">
                                    Qty {it.quantity || "1"}
                                    {it.suggestedDealer
                                      ? ` · ${it.suggestedDealer}`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[10px] text-text-secondary px-1 py-6 text-center border border-dashed border-border/80 rounded-md">
                            {isOver ? "Drop here" : "Drag items here"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= STEP: FINAL REVIEW ================= */}
          {currentStep === "review" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Review Master PO Details Card */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-border pb-2.5">
                  <Building2 className="h-4 w-4 text-accent" />
                  <h3 className="font-bold text-xs text-text uppercase tracking-wider">
                    Purchase Order Header Details
                  </h3>
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
                    <span className="text-[10px] text-text-secondary font-medium block">Order Type</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5",
                        poType === "asset"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      )}
                    >
                      {poType === "asset"
                        ? "Fixed Assets & Equipment"
                        : CONSUMABLE_CLASSIFICATION_LABELS[effectiveClassification]}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary font-medium block">Order Date</span>
                    <span className="font-bold text-text">{poDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary font-medium block">Requested By</span>
                    <span className="font-bold text-text">{requestedByName.trim() || accountDefaultName}</span>
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-3 p-3 rounded-xl border text-xs flex items-start gap-2.5",
                    destinationKind === "project"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                      : "bg-accent/10 border-accent/25 text-text"
                  )}
                >
                  {destinationKind === "project" ? (
                    <HardHat className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Building2 className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
                  )}
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] block">
                      Destination outcome
                    </span>
                    <p className="mt-0.5 leading-relaxed font-medium">
                      {destinationKind === "project"
                        ? "Will credit the project on delivery — not warehouse stock. Lot remaining will be zero; materials cannot be drawn from inventory."
                        : poType === "consumable"
                        ? "Will stock warehouse inventory on delivery (FIFO lot tracking). Available for department requisitions and releases."
                        : "Will register / activate assets in inventory on delivery for institutional tracking."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-text-secondary font-medium block">
                        {destinationKind === "project"
                          ? "Sponsoring Departments"
                          : "Target Departments"}
                      </span>
                      <span className="font-bold text-text">
                        {targetDepartmentIds
                          .map(
                            (id) =>
                              departments.find((d) => d.id === id)?.name
                          )
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </span>
                    </div>

                    {destinationKind === "project" && selectedProject && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider block">
                          Direct Project Allocation
                        </span>
                        <span className="font-bold">
                          {selectedProject.name} ({selectedProject.projectCode})
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className={isMultiPurpose ? "sm:col-span-2" : undefined}>
                      <span className="text-[10px] text-text-secondary font-medium block">
                        Procurement Purpose
                        {isMultiPurpose ? `s (${purposeGroups.length})` : ""}
                      </span>
                      {isMultiPurpose ? (
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                          {purposeGroups.map((g, idx) => (
                            <div
                              key={g.id}
                              className={cn(
                                "inline-flex items-center gap-1.5 min-w-0 rounded-full border px-2.5 py-1",
                                PURPOSE_PILL_COLORS[idx % PURPOSE_PILL_COLORS.length]
                              )}
                              title={`${g.purpose.trim()} · ${g.lineIds.length} line${g.lineIds.length === 1 ? "" : "s"}`}
                            >
                              <span className="text-[10px] font-semibold truncate">
                                {g.purpose.trim() || "Untitled purpose"}
                              </span>
                              <span className="text-[10px] font-mono font-bold shrink-0 opacity-75">
                                {g.lineIds.length} line
                                {g.lineIds.length === 1 ? "" : "s"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-text font-medium leading-relaxed mt-0.5">
                          {primaryPurpose}
                        </p>
                      )}
                    </div>
                    {generalNotes && (
                      <div className={isMultiPurpose ? "sm:col-span-2" : undefined}>
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
                                    : effectiveClassification === "material"
                                    ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                )}
                              >
                                {poType === "asset"
                                  ? "Asset"
                                  : CONSUMABLE_CLASSIFICATION_LABELS[effectiveClassification]}
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
            {currentStep !== "routing" ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-bg text-text transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSafeClose()}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-bg text-text transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep === "routing" && (
              <button
                type="button"
                onClick={handleNextFromRouting}
                className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <span>Continue to Order Info</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {currentStep === "metadata" && (
              <button
                type="button"
                onClick={handleNextFromMetadata}
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
                <span>Continue to Purpose Assignment</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {currentStep === "purposes" && (
              <button
                type="button"
                onClick={handleNextFromPurposes}
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
