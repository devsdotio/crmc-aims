"use client";

import {
  useEffect,
  useId,
  useRef,
  type FormHTMLAttributes,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])';

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.tabIndex !== -1 && !el.closest("[hidden]")
  );
}

export interface AssetDialogShellProps {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  onClose: () => void;
  busy?: boolean;
  size?: "wide" | "narrow";
  /** Matches the purchase-order wizard: fixed height, subtle header, step slot. */
  layout?: "default" | "wizard";
  headerExtra?: ReactNode;
  alert?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** CSS selector for the control that should take focus when the dialog opens. */
  initialFocusSelector?: string;
  formProps?: FormHTMLAttributes<HTMLFormElement>;
}

export function AssetDialogShell({
  title,
  subtitle,
  icon,
  onClose,
  busy = false,
  size = "narrow",
  layout = "default",
  headerExtra,
  alert,
  footer,
  children,
  initialFocusSelector,
  formProps,
}: AssetDialogShellProps) {
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    return () => {
      previousFocusRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const root = panelRef.current;
    const preferred = initialFocusSelector
      ? root?.querySelector<HTMLElement>(initialFocusSelector)
      : null;
    const target =
      preferred && !preferred.hasAttribute("disabled") ? preferred : root;
    target?.focus();
  }, [initialFocusSelector]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (busy) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = focusableElements(panelRef.current);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy]);

  const wizard = layout === "wizard";

  const body = (
    <>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          wizard ? "p-4 sm:p-5" : "px-6 py-4"
        )}
        inert={busy || undefined}
      >
        {children}
      </div>
      {footer ? (
        <div
          className={cn(
            "shrink-0 border-t border-border",
            wizard ? "bg-bg-subtle p-4" : "px-6 py-3"
          )}
          inert={busy || undefined}
        >
          {footer}
        </div>
      ) : null}
    </>
  );

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center overflow-hidden backdrop-blur-xs",
        wizard
          ? "bg-black/50 p-3 sm:p-4 animate-in fade-in duration-200"
          : "bg-black/60 p-4"
      )}
    >
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        aria-busy={busy || undefined}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl outline-none",
          wizard
            ? "h-[78vh] max-h-180 min-h-120 max-w-3xl animate-in zoom-in-95 duration-200"
            : cn(
                "max-h-[calc(100dvh-2rem)]",
                size === "wide" ? "max-w-3xl" : "max-w-md"
              )
        )}
      >
        <div
          className={cn(
            "shrink-0 border-b border-border",
            wizard ? "bg-bg-subtle/50" : ""
          )}
        >
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            wizard ? "px-4 sm:px-5 pt-3 pb-2" : "px-6 py-4"
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {icon ? (
              <div
                className={cn(
                  "shrink-0 text-primary",
                  wizard
                    ? "rounded-lg border border-primary/20 bg-primary/10 p-1.5"
                    : "flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent"
                )}
              >
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              <h2
                id={titleId}
                className={cn(
                  "font-bold leading-tight text-text",
                  wizard ? "truncate text-sm" : "text-base"
                )}
              >
                {title}
              </h2>
              {subtitle ? (
                <p
                  id={subtitleId}
                  className={cn(
                    "text-text-secondary",
                    wizard ? "truncate text-[10px]" : "mt-0.5 text-xs"
                  )}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className={cn(
              "shrink-0 cursor-pointer rounded-lg text-text-secondary hover:bg-border/60 hover:text-text disabled:opacity-50",
              wizard
                ? "p-1"
                : "inline-flex h-11 w-11 items-center justify-center"
            )}
          >
            <X className={wizard ? "h-4 w-4" : "h-5 w-5"} />
          </button>
        </div>
        {headerExtra}
        </div>

        {alert ? (
          <div className={cn("shrink-0 pt-4", wizard ? "px-4 sm:px-5" : "px-6")}>
            {alert}
          </div>
        ) : null}
        {formProps ? (
          <form
            {...formProps}
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              formProps.className
            )}
          >
            {body}
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{body}</div>
        )}
      </div>
    </div>
  );
}
