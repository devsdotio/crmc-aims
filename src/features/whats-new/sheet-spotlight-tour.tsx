"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  PackageMinus,
  Edit3,
  Trash2,
  Printer,
  CheckCircle2,
  Lightbulb,
  MousePointerClick,
  Info,
  ListFilter,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpotlightStep {
  target:
    | "sheet-footer-bar"
    | "sheet-delete-btn"
    | "sheet-primary-btn"
    | "sheet-maintenance-btn"
    | "sheet-header";
  badge: string;
  title: string;
  whyChanged: string;
  description: string;
  benefits: string[];
  haloColor: "accent" | "danger" | "success" | "amber";
}

export const SHEET_SPOTLIGHT_STEPS: SpotlightStep[] = [
  {
    target: "sheet-footer-bar",
    badge: "Step 1 of 5 · Docked Action Bar",
    title: "Sticky Bottom Action Bar",
    whyChanged:
      "Previously, buttons were placed at the very top of the drawer. When reviewing long specifications, custody logs, or audit timelines, you had to scroll all the way back up to act. Now, primary actions are permanently pinned to the bottom of your screen.",
    description:
      "Operational buttons (Issue, Maintenance, Edit) remain in thumb-reach at all times, regardless of how far you scroll.",
    benefits: [
      "Zero scrolling needed to access primary operations",
      "Full touch-friendly 36px targets with readable text labels",
      "Clean separation between content and actions",
    ],
    haloColor: "accent",
  },
  {
    target: "sheet-delete-btn",
    badge: "Step 2 of 5 · Safety Separation",
    title: "Isolated Destructive Action",
    whyChanged:
      "Previously, Delete was packed directly beside daily utility buttons (Print and Edit) in the header, risking accidental clicks. We anchored Delete far to the bottom-left with a cautious outline style.",
    description:
      "Physical distance between destructive and productive actions prevents costly mis-clicks while issuing or updating assets.",
    benefits: [
      "Anchored to bottom-left away from primary action flow",
      "Subtle warning outline style instead of prominent solid fill",
      "Protected by standard confirmation safeguards",
    ],
    haloColor: "danger",
  },
  {
    target: "sheet-primary-btn",
    badge: "Step 3 of 5 · Context-Aware CTA",
    title: "Adaptive Primary Button",
    whyChanged:
      "Different asset states require different next steps. Instead of forcing you to hunt through multiple icons, the primary button dynamically shows the single most relevant action for this asset.",
    description:
      "The rightmost CTA automatically adapts to current equipment readiness:",
    benefits: [
      "Needs Repair ➔ 'Mark Serviceable' in status orange",
      "Active & In Stock ➔ 'Issue Asset' in emerald green",
      "In Custody / Fixed ➔ 'Flag Maintenance' in amber",
    ],
    haloColor: "success",
  },
  {
    target: "sheet-maintenance-btn",
    badge: "Step 4 of 5 · Custom Conditions",
    title: "Custom Conditions during Maintenance",
    whyChanged:
      "Assets often need maintenance for nuanced reasons (e.g., 'Calibration Required', 'Overheating', or 'Sensor Drift') rather than generic 'Damaged' or 'Needs Repair'. Clicking Flag Maintenance now lets you assign custom defect tags that preserve official SLA reporting while accurately describing the real issue.",
    description:
      "Flag maintenance with custom tags while maintaining baseline status integrity:",
    benefits: [
      "Enter exact real-world condition notes with auto-suggestions",
      "Frequently used conditions are remembered as 1-click chips",
      "Automatically maps to baseline repair severity for SLA reporting",
    ],
    haloColor: "amber",
  },
  {
    target: "sheet-header",
    badge: "Step 5 of 5 · Clean Header",
    title: "De-cluttered Header & Instant Print",
    whyChanged:
      "We eliminated the cramped 5-icon toolbar from the top bar. The header is now focused purely on asset orientation, with a dedicated 1-click Print Dossier utility.",
    description:
      "Clear asset title with status and availability badges, plus 1-click access to the enhanced Portrait PDF dossier with scannable QR verification.",
    benefits: [
      "Uncluttered view of asset identity, tag, and status",
      "1-click access to official portrait equipment dossier",
      "Close drawer anytime with backdrop click, Esc, or footer",
    ],
    haloColor: "accent",
  },
];

export interface SheetSpotlightTourProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish?: () => void;
  onViewCatalog?: () => void;
}

export function SheetSpotlightTour({
  isOpen,
  onClose,
  onFinish,
  onViewCatalog,
}: SheetSpotlightTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isInSitu, setIsInSitu] = useState(false);
  const prevIsOpenRef = useRef(false);

  const step = SHEET_SPOTLIGHT_STEPS[currentStepIndex];
  const isLast = currentStepIndex === SHEET_SPOTLIGHT_STEPS.length - 1;

  // Handlers declared before useEffect hooks to ensure proper access
  const handleDismiss = useCallback(() => {
    onFinish?.();
    onClose();
  }, [onFinish, onClose]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleDismiss();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [isLast, handleDismiss]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleSelectStep = useCallback((idx: number) => {
    setCurrentStepIndex(idx);
  }, []);

  // Reset to step 0 only on initial open transition
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setCurrentStepIndex(0);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Measure target element position
  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    const currentTarget = SHEET_SPOTLIGHT_STEPS[currentStepIndex]?.target;
    if (!currentTarget) return;

    let element = document.querySelector(`[data-tour-target="${currentTarget}"]`);
    // Fallback: if individual button isn't visible, fall back to the sheet footer bar
    if (
      !element &&
      (currentTarget === "sheet-delete-btn" ||
        currentTarget === "sheet-primary-btn" ||
        currentTarget === "sheet-maintenance-btn")
    ) {
      element = document.querySelector(`[data-tour-target="sheet-footer-bar"]`);
    }

    if (element) {
      // Target exists on page (In-Situ Mode)
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      setIsInSitu(true);
    } else {
      // Target not on page (e.g. sheet closed) -> Fallback Simulator Mode
      setTargetRect(null);
      setIsInSitu(false);
    }
  }, [isOpen, currentStepIndex]);

  // Recalculate target rect on open, step change, resize or scroll
  useEffect(() => {
    if (!isOpen) return;
    updateTargetRect();
    const handleResizeOrScroll = () => updateTargetRect();
    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);
    return () => {
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [isOpen, updateTargetRect]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        handleDismiss();
      } else if (e.key === "ArrowRight") {
        if (currentStepIndex < SHEET_SPOTLIGHT_STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex, handleDismiss]);

  if (!isOpen) return null;

  // ─── MODE A: IN-SITU SPOTLIGHT (Real sheet is visible on screen) ───────
  if (isInSitu && targetRect) {
    const pad = 6;
    const cutout = {
      x: Math.max(0, targetRect.left - pad),
      y: Math.max(0, targetRect.top - pad),
      width: targetRect.width + pad * 2,
      height: targetRect.height + pad * 2,
    };

    // Card placement calculation: if target is in bottom half of screen, popover goes cleanly ABOVE target with clearance
    const isBottom = targetRect.top > window.innerHeight / 2;
    const clearance = 32; // Clearance between card and spotlighted element

    // When target is at bottom (e.g. footer bar, delete, primary CTA), anchor bottom edge above target
    const cardBottom = window.innerHeight - targetRect.top + clearance;
    const cardTop = targetRect.bottom + 20;

    const cardWidth = 420;
    const cardLeft = Math.min(
      window.innerWidth - cardWidth - 16,
      Math.max(16, targetRect.right - cardWidth)
    );

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-title"
        className="fixed inset-0 z-70 pointer-events-auto select-none"
      >
        {/* SVG Mask for smooth dark overlay with cutout hole */}
        <svg
          className="fixed inset-0 w-full h-full pointer-events-auto transition-all duration-300"
          style={{ width: "100vw", height: "100vh" }}
          onClick={handleDismiss}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={cutout.x}
                y={cutout.y}
                width={cutout.width}
                height={cutout.height}
                rx="10"
                ry="10"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%" height="100%"
            fill="rgba(0, 0, 0, 0.72)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Pulsating Glowing Ring around the Spotlighted Element */}
        <div
          className={cn(
            "fixed rounded-xl pointer-events-none transition-all duration-300 ring-4 animate-pulse",
            step.haloColor === "danger"
              ? "ring-status-outofservice-text bg-status-outofservice-bg/10 shadow-[0_0_24px_rgba(239,68,68,0.5)]"
              : step.haloColor === "success"
                ? "ring-emerald-500 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.5)]"
                : step.haloColor === "amber"
                  ? "ring-amber-400 bg-amber-400/10 shadow-[0_0_24px_rgba(245,158,11,0.5)]"
                  : "ring-accent bg-accent/10 shadow-[0_0_24px_rgba(59,130,246,0.5)]"
          )}
          style={{
            left: `${cutout.x}px`,
            top: `${cutout.y}px`,
            width: `${cutout.width}px`,
            height: `${cutout.height}px`,
          }}
        />

        {/* Floating Explanation Card (Elevated with guaranteed clearance) */}
        <div
          className="fixed z-80 w-105 max-w-[calc(100vw-32px)] bg-bg border border-border/80 shadow-2xl rounded-2xl overflow-y-auto p-5 space-y-4 animate-in fade-in-50 zoom-in-95 duration-200 pointer-events-auto"
          style={
            isBottom
              ? {
                  bottom: `${cardBottom}px`,
                  left: `${cardLeft}px`,
                  maxHeight: `calc(${targetRect.top}px - ${clearance + 16}px)`,
                }
              : {
                  top: `${cardTop}px`,
                  left: `${cardLeft}px`,
                  maxHeight: `calc(100vh - ${targetRect.bottom}px - 32px)`,
                }
          }
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
                  {step.badge}
                </span>
                <h3 id="spotlight-title" className="text-sm font-extrabold text-text leading-tight">
                  {step.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onViewCatalog && (
                <button
                  type="button"
                  onClick={onViewCatalog}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-text px-2 py-1 rounded-md hover:bg-border/60 transition-colors cursor-pointer"
                >
                  <ListFilter className="h-3 w-3" />
                  <span>All Updates</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close tour"
                className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* "Why This Changed" Callout */}
          <div className="p-3.5 rounded-xl border border-accent/25 bg-accent/5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-accent font-bold text-xs uppercase tracking-wide">
              <Lightbulb className="h-3.5 w-3.5 shrink-0" />
              <span>Why We Changed This</span>
            </div>
            <p className="text-xs text-text leading-relaxed">
              {step.whyChanged}
            </p>
          </div>

          {/* Key Benefits */}
          <div className="space-y-1.5">
            {step.benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-text">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Step Indicators & Actions */}
          <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {SHEET_SPOTLIGHT_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectStep(idx)}
                  aria-label={`Go to step ${idx + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all cursor-pointer",
                    idx === currentStepIndex
                      ? "w-6 bg-accent"
                      : "w-1.5 bg-border hover:bg-text-secondary/40"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-bg hover:bg-bg-subtle text-text transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <span>{isLast ? "Got it, finish" : "Next highlight"}</span>
                {isLast ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── MODE B: SPACIOUS SIMULATOR (Sheet is not open in background) ─────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotlight-title"
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in-50 duration-200"
    >
      <div className="absolute inset-0" onClick={handleDismiss} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-xl bg-bg border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-border bg-bg-subtle/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                Interactive Spotlight Tour
              </p>
              <h3 id="spotlight-title" className="text-sm font-bold text-text leading-tight">
                Asset Details Sheet · Button Layout Changes
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onViewCatalog && (
              <button
                type="button"
                onClick={onViewCatalog}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-text px-2 py-1 rounded-md hover:bg-border/60 transition-colors cursor-pointer"
              >
                <ListFilter className="h-3 w-3" />
                <span>All Updates</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close"
              className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Spacious Interactive Sheet Stage (Full Height, No Overlaps!) */}
        <div className="p-5 bg-neutral-900/10 dark:bg-black/30 border-b border-border">
          <div className="rounded-xl border border-border bg-bg shadow-md overflow-hidden relative">
            {/* Spotlight Beam Indicator Banner */}
            <div className="px-3.5 py-1.5 bg-bg-subtle border-b border-border flex items-center justify-between text-[11px]">
              <span className="font-semibold text-text-secondary flex items-center gap-1.5">
                <MousePointerClick className="h-3.5 w-3.5 text-accent" />
                <span>Simulating Asset Detail Drawer</span>
              </span>
              <span className="font-bold text-accent text-[10px] uppercase tracking-wide">
                Highlighting: {step.title}
              </span>
            </div>

            {/* Simulated Header */}
            <div
              className={cn(
                "p-4 border-b transition-all duration-300 flex items-center justify-between gap-3",
                step.target === "sheet-header"
                  ? "border-amber-500 bg-amber-500/10 shadow-sm ring-2 ring-amber-400/50"
                  : "border-border/60 bg-bg-subtle/40 opacity-70"
              )}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-text text-sm truncate">
                    Dell Latitude 5520 Core i7
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-status-active-bg text-white">
                    Active
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                    Available
                  </span>
                </div>
                <p className="text-xs text-text-secondary font-mono tracking-tight">
                  AST-EM-003 · Computer Equipment
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-lg border transition-colors",
                    step.target === "sheet-header"
                      ? "border-amber-400 bg-amber-400/20 text-amber-500 ring-2 ring-amber-400/50 font-bold"
                      : "border-border bg-bg text-text-secondary"
                  )}
                  title="Print Dossier (PDF)"
                >
                  <Printer className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Simulated Scrollable Specifications Body */}
            <div className="p-4 space-y-3 bg-bg-subtle/20 opacity-75">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg border border-border/60 bg-bg space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-text-secondary">Category</span>
                  <p className="font-semibold text-text">IT &amp; AV Equipment</p>
                </div>
                <div className="p-2 rounded-lg border border-border/60 bg-bg space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-text-secondary">Custodian</span>
                  <p className="font-semibold text-text">Main Storage Vault</p>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-dashed border-border/70 bg-bg text-center text-xs text-text-secondary italic">
                Scroll through specifications, financial TCO, and custody history...
              </div>
            </div>

            {/* Simulated Sticky Action Footer */}
            <div
              className={cn(
                "p-3.5 border-t transition-all duration-300 flex items-center justify-between gap-3 bg-bg/95",
                step.target === "sheet-footer-bar"
                  ? "border-accent bg-accent/10 ring-2 ring-accent/50 shadow-md"
                  : "border-border/80"
              )}
            >
              {/* Delete Button */}
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300",
                  step.target === "sheet-delete-btn"
                    ? "border border-status-outofservice-text bg-status-outofservice-bg/20 text-status-outofservice-text ring-2 ring-status-outofservice-text/50 shadow-md font-bold"
                    : "text-status-outofservice-text/80 hover:bg-status-outofservice-bg/10 border border-transparent"
                )}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </div>

              {/* Action Group */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-bg text-text text-xs font-semibold shadow-xs">
                  <Edit3 className="h-3.5 w-3.5 text-text-secondary" />
                  <span>Edit</span>
                </div>

                {/* Flag Maintenance Button with Custom Condition Spotlight */}
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300",
                    step.target === "sheet-maintenance-btn"
                      ? "border border-amber-400 bg-amber-400/20 text-amber-700 dark:text-amber-300 ring-4 ring-amber-400/40 shadow-lg font-bold animate-pulse"
                      : "border border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-400"
                  )}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Flag Maintenance</span>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-all duration-300",
                    step.target === "sheet-primary-btn"
                      ? "bg-emerald-600 ring-4 ring-emerald-500/40 shadow-lg animate-pulse"
                      : "bg-emerald-600/90"
                  )}
                >
                  <PackageMinus className="h-4 w-4" />
                  <span>Issue Asset</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Explanation & "Why We Changed This" */}
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent">
              {step.badge}
            </span>
            <h4 className="text-base font-extrabold text-text leading-tight">
              {step.title}
            </h4>
          </div>

          {/* Rationale Box */}
          <div className="p-3.5 rounded-xl border border-accent/25 bg-accent/5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-accent font-bold text-xs uppercase tracking-wide">
              <Lightbulb className="h-3.5 w-3.5 shrink-0" />
              <span>Why We Changed This</span>
            </div>
            <p className="text-xs text-text leading-relaxed">
              {step.whyChanged}
            </p>
          </div>

          {/* Benefits List */}
          <div className="space-y-1.5">
            {step.benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-text">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Navigation Footer */}
        <div className="px-5 py-3.5 border-t border-border bg-bg-subtle/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {SHEET_SPOTLIGHT_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  idx === currentStepIndex
                    ? "w-6 bg-accent"
                    : "w-1.5 bg-border hover:bg-text-secondary/40"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-bg hover:bg-bg-subtle text-text transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <span>{isLast ? "Got it, finish tour" : "Next highlight"}</span>
              {isLast ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
