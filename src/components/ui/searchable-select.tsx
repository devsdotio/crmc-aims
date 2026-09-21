"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  /** Extra text included in filtering (e.g. codes). */
  keywords?: string;
};

export type SearchableSelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Shown when focus opens an empty query and there are no options. */
  emptyMessage?: string;
  /** When set, an extra clear row appears at the top of the list. */
  clearLabel?: string;
  className?: string;
  inputClassName?: string;
  "aria-required"?: boolean | "true" | "false";
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
};

function optionMatches(option: SearchableSelectOption, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${option.label} ${option.keywords ?? ""} ${option.value}`
    .toLowerCase()
    .trim();
  return haystack.includes(q);
}

export function SearchableSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Type to search…",
  disabled = false,
  emptyMessage = "No options available",
  clearLabel,
  className,
  inputClassName,
  "aria-required": ariaRequired,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: SearchableSelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const focusedRef = useRef(false);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  // Keep the visible text in sync with the selected option unless the user is typing.
  useEffect(() => {
    if (focusedRef.current) return;
    setQuery(selected?.label ?? "");
  }, [selected?.label, value]);

  const filtered = useMemo(() => {
    const q = query.trim();
    // While closed / synced to selection label, show the full list on open.
    if (selected && q === selected.label) return options;
    return options.filter((o) => optionMatches(o, q));
  }, [options, query, selected]);

  const rows = useMemo(() => {
    const items: Array<
      | { kind: "clear"; label: string }
      | { kind: "option"; option: SearchableSelectOption }
    > = [];
    if (clearLabel) items.push({ kind: "clear", label: clearLabel });
    for (const option of filtered) {
      items.push({ kind: "option", option });
    }
    return items;
  }, [clearLabel, filtered]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        focusedRef.current = false;
        setQuery(selected?.label ?? "");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [selected?.label]);

  const pick = (next: string) => {
    onValueChange(next);
    const label = next
      ? (options.find((o) => o.value === next)?.label ?? "")
      : "";
    setQuery(label);
    setOpen(false);
    focusedRef.current = false;
  };

  const commitOnBlur = () => {
    focusedRef.current = false;
    setOpen(false);
    const q = query.trim().toLowerCase();
    if (!q) {
      if (clearLabel || !value) {
        if (value) onValueChange("");
        setQuery("");
      } else {
        setQuery(selected?.label ?? "");
      }
      return;
    }
    const exact = options.find(
      (o) =>
        !o.disabled &&
        (o.label.toLowerCase() === q || o.value.toLowerCase() === q)
    );
    if (exact) {
      pick(exact.value);
      return;
    }
    setQuery(selected?.label ?? "");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) =>
        rows.length === 0 ? 0 : Math.min(i + 1, rows.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const row = rows[highlight];
      if (!row) return;
      e.preventDefault();
      if (row.kind === "clear") pick("");
      else if (!row.option.disabled) pick(row.option.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setQuery(selected?.label ?? "");
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-required={ariaRequired}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        autoComplete="off"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          focusedRef.current = true;
          setOpen(true);
        }}
        onBlur={commitOnBlur}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text font-medium focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50",
          inputClassName
        )}
      />
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-bg shadow-lg"
        >
          {options.length === 0 && !clearLabel ? (
            <li className="px-3 py-2 text-xs text-text-secondary">
              {emptyMessage}
            </li>
          ) : rows.length === 0 ? (
            <li className="px-3 py-2 text-xs text-text-secondary">
              No matches for “{query.trim()}”
            </li>
          ) : (
            rows.map((row, index) => {
              const active = index === highlight;
              if (row.kind === "clear") {
                return (
                  <li
                    key="__clear"
                    role="option"
                    aria-selected={value === "" && active}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick("")}
                      onMouseEnter={() => setHighlight(index)}
                      className={cn(
                        "w-full px-3 py-2 text-left text-xs cursor-pointer",
                        active
                          ? "bg-accent/15 text-text font-semibold"
                          : "text-text-secondary hover:bg-bg-subtle"
                      )}
                    >
                      {row.label}
                    </button>
                  </li>
                );
              }

              const { option } = row;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                >
                  <button
                    type="button"
                    disabled={option.disabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!option.disabled) pick(option.value);
                    }}
                    onMouseEnter={() => setHighlight(index)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                      active
                        ? "bg-accent/15 text-text font-semibold"
                        : "text-text hover:bg-bg-subtle"
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
