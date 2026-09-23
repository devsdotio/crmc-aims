"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  id: string;
  label: string;
  renderDot?: () => React.ReactNode;
};

export type MultiSelectDropdownProps = {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  options: MultiSelectOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onOpen?: () => void;
  /** Compact filter chip (default) vs full-width form control. */
  variant?: "filter" | "form";
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  triggerClassName?: string;
  "aria-required"?: boolean | "true" | "false";
};

export function MultiSelectDropdown({
  label,
  icon: Icon,
  options,
  selectedIds,
  onToggle,
  onOpen,
  variant = "filter",
  placeholder,
  emptyMessage = "No options available",
  disabled = false,
  searchable = false,
  className,
  triggerClassName,
  "aria-required": ariaRequired,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabels = useMemo(() => {
    if (selectedIds.length === 0) return "";
    return selectedIds
      .map((id) => options.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(", ");
  }, [options, selectedIds]);

  const isForm = variant === "form";

  return (
    <div className={cn("relative", isForm && "w-full", className)} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        aria-required={ariaRequired}
        aria-expanded={isOpen}
        onClick={() => {
          if (disabled) return;
          const next = !isOpen;
          setIsOpen(next);
          if (next) onOpen?.();
          if (!next) setQuery("");
        }}
        className={cn(
          isForm
            ? "w-full h-9 px-3 rounded-lg border bg-bg text-text text-xs font-medium flex items-center justify-between gap-2 focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden disabled:opacity-60"
            : "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
          isForm
            ? selectedIds.length > 0
              ? "border-border text-text"
              : "border-border text-text-secondary"
            : selectedIds.length > 0
              ? "border-accent/50 bg-accent/5 text-text"
              : "border-border bg-bg-subtle text-text-secondary hover:bg-border/60 hover:text-text",
          triggerClassName
        )}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />}
          {isForm ? (
            <span className="truncate">
              {selectedLabels || placeholder || label}
            </span>
          ) : (
            <>
              {label}
              {selectedIds.length > 0 && (
                <span className="inline-flex items-center justify-center bg-accent text-accent-foreground text-[10px] h-4 w-4 rounded-full ml-1">
                  {selectedIds.length}
                </span>
              )}
            </>
          )}
        </span>
        {isForm && selectedIds.length > 0 && (
          <span className="inline-flex items-center justify-center bg-accent text-accent-foreground text-[10px] h-4 min-w-4 px-1 rounded-full shrink-0">
            {selectedIds.length}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full left-0 mt-1.5 bg-bg border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150",
            isForm ? "w-full min-w-[16rem]" : "w-56"
          )}
        >
          {searchable && (
            <div className="p-1.5 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-8 pl-7 pr-2 rounded-lg border border-border bg-bg-subtle text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-accent/30"
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <p className="p-2 text-xs text-text-secondary text-center">
                {emptyMessage}
              </p>
            ) : (
              filtered.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onToggle(opt.id)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-bg-subtle transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {opt.renderDot && opt.renderDot()}
                      <span
                        className={cn(
                          "truncate",
                          isSelected
                            ? "font-bold text-text"
                            : "text-text-secondary"
                        )}
                      >
                        {opt.label}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
