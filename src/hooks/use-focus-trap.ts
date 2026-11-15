"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/** Stack of mounted open overlay symbols so nested Escape presses only close the topmost dialog. */
const overlayStack: symbol[] = [];

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (el) => !el.hasAttribute("aria-hidden") && el.getClientRects().length > 0
  );
}

/**
 * Traps Tab/Shift+Tab inside an open dialog/drawer, handles topmost Escape,
 * and restores focus to the triggering element on unmount/close.
 */
export function useFocusTrap(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onEscape?: () => void
) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!isOpen) return;
    const token = Symbol("overlay");
    overlayStack.push(token);

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const rafId = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      if (!container.contains(document.activeElement)) {
        const focusables = getFocusable(container);
        (focusables[0] ?? container).focus({ preventScroll: true });
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (overlayStack[overlayStack.length - 1] !== token) return;
      const container = containerRef.current;

      if (e.key === "Escape") {
        if (onEscapeRef.current) {
          e.preventDefault();
          e.stopPropagation();
          onEscapeRef.current();
        }
        return;
      }

      if (e.key !== "Tab" || !container) return;
      const focusables = getFocusable(container);
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (!active || !container.contains(active) || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (!active || !container.contains(active) || active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleKeyDown, true);
      const idx = overlayStack.lastIndexOf(token);
      if (idx !== -1) overlayStack.splice(idx, 1);
      if (previouslyFocused && previouslyFocused.isConnected) {
        window.requestAnimationFrame(() => {
          previouslyFocused.focus({ preventScroll: true });
        });
      }
    };
  }, [isOpen, containerRef]);
}
