"use client";

import React, { useState, useEffect } from "react";
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
  Wrench,
  CheckCircle2,
  Tag,
  QrCode,
  FileText,
  ListFilter,
  Calendar,
  ExternalLink,
  Lightbulb,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhatsNewFeature, WhatsNewStep } from "./types";
import { WHATS_NEW_REGISTRY } from "./registry";
import { SheetSpotlightTour } from "./sheet-spotlight-tour";

function SheetButtonsMockup({
  highlight,
}: {
  highlight?: "footer-primary" | "footer-destructive" | "footer-contextual" | "header";
}) {
  return (
    <div className="rounded-xl border border-border bg-bg shadow-sm p-4 space-y-3 relative overflow-hidden text-xs">
      {/* Header */}
      <div
        className={cn(
          "p-3 rounded-xl border transition-all duration-300 flex items-center justify-between gap-3",
          highlight === "header"
            ? "border-amber-500 bg-amber-500/10 shadow-sm ring-2 ring-amber-400/50"
            : "border-border/60 bg-bg-subtle/50"
        )}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-text text-xs sm:text-sm truncate">
              Dell Latitude 5520 Core i7
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-status-active-bg text-white">
              Active
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
              Available
            </span>
          </div>
          <p className="text-xs text-text-secondary font-mono tracking-tight">
            AST-EM-003 · Equipment
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-lg border transition-colors",
              highlight === "header"
                ? "border-amber-400 bg-amber-400/20 text-amber-500 font-bold ring-2 ring-amber-400/50"
                : "border-border bg-bg text-text-secondary"
            )}
            title="Print Dossier (PDF)"
          >
            <Printer className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Body Area */}
      <div className="p-3 rounded-lg border border-border/50 bg-bg-subtle/30 space-y-2.5">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded border border-border/60 bg-bg space-y-0.5">
            <div className="text-[9px] font-bold uppercase text-text-secondary">Category</div>
            <div className="text-xs font-semibold text-text truncate">IT Equipment</div>
          </div>
          <div className="p-2 rounded border border-border/60 bg-bg space-y-0.5">
            <div className="text-[9px] font-bold uppercase text-text-secondary">Custodian</div>
            <div className="text-xs font-semibold text-text truncate">Main Vault</div>
          </div>
          <div className="p-2 rounded border border-border/60 bg-bg space-y-0.5">
            <div className="text-[9px] font-bold uppercase text-text-secondary">Condition</div>
            <div className="text-xs font-semibold text-text truncate">Good</div>
          </div>
        </div>
        <div className="p-2 rounded border border-dashed border-border/60 bg-bg/50 text-center">
          <span className="text-[10px] text-text-secondary italic">
            Scrollable asset specifications, maintenance timeline &amp; custody log
          </span>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
        {/* Left Destructive */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
            highlight === "footer-destructive"
              ? "border border-status-outofservice-text bg-status-outofservice-bg/20 text-status-outofservice-text shadow-sm ring-2 ring-status-outofservice-text/40"
              : "text-status-outofservice-text/80 border border-transparent hover:bg-status-outofservice-bg/10"
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </div>

        {/* Right Operations */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-300",
              highlight === "footer-primary"
                ? "border-accent bg-accent/15 text-accent font-bold ring-2 ring-accent/30"
                : "border-border bg-bg text-text"
            )}
          >
            <Edit3 className="h-3.5 w-3.5 text-text-secondary" />
            <span>Edit</span>
          </div>

          {highlight === "footer-contextual" ? (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-500/40 animate-pulse">
              <PackageMinus className="h-3.5 w-3.5" />
              <span>Issue Asset</span>
            </div>
          ) : (
            <div
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all duration-300",
                highlight === "footer-primary"
                  ? "bg-accent shadow-xs ring-2 ring-accent/40"
                  : "bg-emerald-600/90"
              )}
            >
              <PackageMinus className="h-3.5 w-3.5" />
              <span>Primary CTA</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomConditionMockup() {
  return (
    <div className="rounded-xl border border-border bg-bg shadow-inner p-3 space-y-2.5 text-xs">
      {/* Dialog Header with '+ Add custom condition' link */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
        <span className="text-[11px] font-semibold text-text">
          Condition <span className="text-accent">*</span>
        </span>
        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/30 shadow-2xs">
          <Plus className="h-3 w-3" />
          <span>Add custom condition</span>
        </div>
      </div>

      <div className="p-2.5 rounded-lg border border-accent/40 bg-accent/5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Custom Condition Creator
          </span>
          <span className="text-[9px] font-mono text-text-secondary">Custom Mode</span>
        </div>
        <div className="h-7 px-2 bg-bg border border-border rounded flex items-center text-text font-medium text-[11px]">
          Calibration Required
        </div>
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <div className="p-1.5 rounded border border-status-repair-bg bg-status-repair-bg/15 flex items-center gap-1.5">
            <Wrench className="h-3 w-3 text-status-repair-text shrink-0" />
            <span className="text-[10px] font-bold text-text">Needs Repair Baseline</span>
          </div>
          <div className="p-1.5 rounded border border-border bg-bg flex items-center gap-1.5 opacity-60">
            <span className="text-[10px] text-text-secondary">Damaged Baseline</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <span className="text-[9px] font-bold uppercase tracking-wide text-text-secondary">Saved:</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg border border-accent text-accent">
          <Tag className="h-2.5 w-2.5" /> Calibration Required
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg border border-border text-text">
          <Tag className="h-2.5 w-2.5 text-text-secondary" /> Overheating
        </span>
      </div>
    </div>
  );
}

function DossierPrintMockup() {
  return (
    <div className="rounded-xl border border-border bg-bg shadow-inner p-3 space-y-2 text-xs">
      <div className="p-2.5 rounded-lg border border-black bg-white text-black space-y-1.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-black pb-1.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full border border-black flex items-center justify-center font-bold text-[8px]">
              CRMC
            </div>
            <div>
              <p className="font-extrabold text-[10px] tracking-tight uppercase">CRMC-AIMS</p>
              <p className="text-[7.5px] text-black/70">Equipment Dossier &amp; Audit</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 border border-black p-0.5 flex items-center justify-center">
              <QrCode className="h-4 w-4" />
            </div>
            <div className="border border-black px-1 py-0.5 text-[7px] font-mono">
              AST-DOS-003
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 border border-black p-1 text-[7.5px]">
          <div><p className="font-bold">VALUE</p><p>₱500.00</p></div>
          <div><p className="font-bold">STATE</p><p>ACTIVE</p></div>
          <div><p className="font-bold">REPAIRS</p><p>0 orders</p></div>
          <div><p className="font-bold">HOLDER</p><p>Storage</p></div>
        </div>
        <div className="pt-1 border-t border-black grid grid-cols-3 gap-2 text-[7px] text-center">
          <div className="border-t border-black pt-0.5">Custodian Sign</div>
          <div className="border-t border-black pt-0.5">Inspector Sign</div>
          <div className="border-t border-black pt-0.5">Holder Sign</div>
        </div>
      </div>
    </div>
  );
}

export interface WhatsNewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialFeatureId?: string | null;
  features?: WhatsNewFeature[];
  onMarkSeen?: (featureId: string) => void;
}

export function WhatsNewDialog({
  isOpen,
  onClose,
  initialFeatureId = null,
  features = WHATS_NEW_REGISTRY,
  onMarkSeen,
}: WhatsNewDialogProps) {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>(
    initialFeatureId || features[0]?.id || ""
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"tour" | "catalog">(
    initialFeatureId ? "tour" : "tour"
  );

  useEffect(() => {
    if (isOpen) {
      if (initialFeatureId) {
        setSelectedFeatureId(initialFeatureId);
        setViewMode("tour");
      }
      setCurrentStepIndex(0);
    }
  }, [isOpen, initialFeatureId]);

  const activeFeature =
    features.find((f) => f.id === selectedFeatureId) || features[0];
  const steps = activeFeature?.steps || [];
  const currentStep = steps[currentStepIndex] || steps[0];
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        handleClose();
      } else if (viewMode === "tour") {
        if (e.key === "ArrowRight") {
          if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
          }
        } else if (e.key === "ArrowLeft") {
          if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1);
          }
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, viewMode, currentStepIndex, steps.length]);

  if (!isOpen || !activeFeature) return null;

  const handleClose = () => {
    if (activeFeature) {
      onMarkSeen?.(activeFeature.id);
    }
    onClose();
  };

  // Dedicated interactive Spotlight Tour with "Why We Changed This" rationale & spotlight beams
  if (viewMode === "tour" && activeFeature.id === "asset-sheet-button-layout") {
    return (
      <SheetSpotlightTour
        isOpen={isOpen}
        onClose={handleClose}
        onFinish={() => onMarkSeen?.(activeFeature.id)}
        onViewCatalog={() => setViewMode("catalog")}
      />
    );
  }

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSelectFeature = (feature: WhatsNewFeature) => {
    setSelectedFeatureId(feature.id);
    setCurrentStepIndex(0);
    setViewMode("tour");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-modal-title"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 duration-200"
    >
      <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-lg bg-bg border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-border bg-bg-subtle/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent shadow-2xs shrink-0">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent truncate">
                  CRMC-AIMS What&apos;s New
                </p>
                {activeFeature.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-accent/15 text-accent shrink-0">
                    {activeFeature.badge}
                  </span>
                )}
              </div>
              <h3
                id="whats-new-modal-title"
                className="text-sm font-bold text-text truncate leading-tight"
              >
                {viewMode === "catalog" ? "All Platform Updates" : activeFeature.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {viewMode === "tour" ? (
              <button
                type="button"
                onClick={() => setViewMode("catalog")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-text px-2 py-1 rounded-md hover:bg-border/60 transition-colors cursor-pointer"
              >
                <ListFilter className="h-3 w-3" />
                <span>All Updates</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode("tour")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline px-2 py-1 cursor-pointer"
              >
                Back to Tour
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {viewMode === "catalog" ? (
          /* Catalog / All Updates View */
          <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-text-secondary">
              Browse recent updates, visual redesigns, and interactive walkthroughs across CRMC-AIMS:
            </p>

            <div className="space-y-2.5">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  onClick={() => handleSelectFeature(feature)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 group",
                    feature.id === activeFeature.id
                      ? "border-accent bg-accent/5 shadow-xs"
                      : "border-border bg-bg hover:border-border/80 hover:bg-bg-subtle/50"
                  )}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-bg-subtle border border-border text-text-secondary uppercase">
                        {feature.category}
                      </span>
                      <span className="text-[10px] font-mono text-text-secondary">
                        {feature.version} · {feature.releaseDate}
                      </span>
                      {feature.isNew && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          New
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-text group-hover:text-accent transition-colors leading-tight">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                      {feature.tagline}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-bg border border-border group-hover:border-accent group-hover:bg-accent group-hover:text-white transition-all shrink-0 cursor-pointer"
                  >
                    <span>Tour</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Tour Mode */
          <>
            {/* Visual Stage */}
            <div className="p-4 bg-bg-subtle/30 border-b border-border">
              {currentStep.mockupType === "sheet-buttons" && (
                <SheetButtonsMockup highlight={currentStep.mockupHighlight} />
              )}
              {currentStep.mockupType === "custom-condition" && <CustomConditionMockup />}
              {currentStep.mockupType === "dossier-print" && <DossierPrintMockup />}
              {(!currentStep.mockupType || currentStep.mockupType === "generic") && (
                <SheetButtonsMockup highlight={currentStep.mockupHighlight} />
              )}
            </div>

            {/* Step Body */}
            <div className="p-5 space-y-3.5">
              <div className="space-y-1">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent">
                  {currentStep.badge}
                </span>
                <h4 className="text-base font-bold text-text leading-tight">
                  {currentStep.title}
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {currentStep.description}
                </p>
              </div>

              {currentStep.highlights && currentStep.highlights.length > 0 && (
                <div className="p-3 rounded-xl bg-bg-subtle/50 border border-border/70 space-y-2">
                  {currentStep.highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-text">
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Navigation Footer */}
            <div className="px-5 py-3.5 border-t border-border bg-bg-subtle/50 flex items-center justify-between gap-3">
              {/* Step Dots */}
              <div
                className="flex items-center gap-1.5"
                role="tablist"
                aria-label="Tour steps"
              >
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentStepIndex(idx)}
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

              {/* Action Buttons */}
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
                  <span>{isLastStep ? "Got it, finish" : "Next step"}</span>
                  {isLastStep ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
