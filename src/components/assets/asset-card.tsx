"use client";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { User, MapPin, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  custodyBadgeLabel,
  custodyDetailLabel,
} from "@/lib/assets-custody";
import type { Asset, AssetStatus } from "@/types/assets";
import { AssignmentTypeBadge } from "./assignment-type-badge";

export interface AssetCardProps {
  asset: Asset;
  onSelect: (asset: Asset) => void;
}

const STATUS_STYLES: Record<
  AssetStatus,
  { bg: string; text: string; label: string }
> = {
  active: {
    bg: "bg-status-active-bg",
    text: "text-white font-bold",
    label: "Active",
  },
  needs_repair: {
    bg: "bg-status-repair-bg",
    text: "text-white font-bold",
    label: "Needs Repair",
  },
  out_of_service: {
    bg: "bg-status-outofservice-bg",
    text: "text-white font-bold",
    label: "Out of Service",
  },
  retired: {
    bg: "bg-status-retired-bg",
    text: "text-white font-bold",
    label: "Retired",
  },
  missing: {
    bg: "bg-status-outofservice-bg",
    text: "text-white font-bold",
    label: "Missing",
  },
};

export function AssetCard({ asset, onSelect }: AssetCardProps) {
  const { getCategoryStyle } = useCategoryStyleMap();
  const categoryMeta = getCategoryStyle(asset.category);
  const statusMeta = STATUS_STYLES[asset.status];

  return (
    <div
      onClick={() => onSelect(asset)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(asset);
        }
      }}
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-bg overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:shadow-md hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      )}
    >
      {/* Top Banner: Asset Code & Status Badge */}
      <div className="flex items-center justify-between p-3.5 border-b border-border bg-bg-subtle/50">
        <span className="font-mono text-xs font-bold text-text bg-bg px-2 py-0.5 rounded border border-border">
          {asset.assetCode}
        </span>
        <div className="flex items-center gap-2">
          <AssignmentTypeBadge type={asset.assignmentType} compact />
          {asset.currentHolder && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary text-white">
              {custodyBadgeLabel(asset.currentHolder, asset.assignmentType)}
            </span>
          )}
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[11px] font-bold",
              statusMeta.bg,
              statusMeta.text,
            )}
          >
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Category Pill */}
        <div>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs",
              categoryMeta.bg,
              categoryMeta.text,
            )}
          >
            <Tag className="h-2.5 w-2.5 shrink-0" />
            {categoryMeta.label}
          </span>
        </div>

        {/* Asset Name */}
        <h3 className="text-sm font-bold text-text leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {asset.name}
        </h3>

        {/* Location & Holder Info */}
        <div className="mt-auto space-y-1.5 pt-3 border-t border-border/60 text-xs text-text-secondary">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-text-secondary/70" />
            <span className="truncate">{asset.location}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0 text-text-secondary/70" />
            <span
              className={cn(
                "font-semibold truncate",
                asset.currentHolder ? "text-text" : "text-status-active-text"
              )}
              title={asset.currentHolder || undefined}
            >
              {custodyDetailLabel(asset.currentHolder)}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 py-2.5 bg-bg-subtle border-t border-border flex items-center justify-between">
        <span className="text-[11px] text-text-secondary">
          Click for details
        </span>
      </div>
    </div>
  );
}
