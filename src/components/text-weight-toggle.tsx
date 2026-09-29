"use client";

import { useSyncExternalStore } from "react";
import { Type } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  applyWeightedText,
  readWeightedTextEnabled,
  subscribeWeightedText,
  writeWeightedText,
} from "@/lib/text-weight";

export function TextWeightToggle() {
  const enabled = useSyncExternalStore(
    subscribeWeightedText,
    readWeightedTextEnabled,
    () => false,
  );

  const setEnabled = (next: boolean) => {
    writeWeightedText(next);
    applyWeightedText(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? "Heavier text on" : "Heavier text off"}
      onClick={(event) => {
        event.stopPropagation();
        setEnabled(!enabled);
      }}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <Type className="w-4 h-4 text-white/50 shrink-0" />
        <span className="font-medium truncate">Heavier text</span>
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-semibold text-white/50 w-6 text-right">
          {enabled ? "On" : "Off"}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "relative block h-[20px] w-[36px] min-w-[36px] shrink-0 overflow-hidden rounded-full transition-colors",
            enabled ? "bg-accent" : "bg-white/20",
          )}
        >
          <span
            className="absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-xs transition-[left] duration-150"
            style={{ left: enabled ? 18 : 2 }}
          />
        </span>
      </span>
    </button>
  );
}
