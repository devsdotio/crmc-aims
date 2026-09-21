"use client";
import { useCategoryStyleMap } from "@/features/categories/client/use-categories";
import { useQueryClient } from "@tanstack/react-query";
import { assetQueryKeys } from "@/features/assets/client/query-keys";
import { assetsApi } from "@/features/assets/client/assets-api";
import { Tag, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  custodyBadgeLabel,
  custodyDetailLabel,
} from "@/lib/assets-custody";
import type { Asset,  AssetStatus } from "@/types/assets";
import { AssignmentTypeBadge } from "./assignment-type-badge";

export interface AssetTableRowProps {
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

export function AssetTableRow({ asset, onSelect }: AssetTableRowProps) {
  const { getCategoryStyle } = useCategoryStyleMap();
  const categoryMeta = getCategoryStyle(asset.category);
  const statusMeta = STATUS_STYLES[asset.status];

  const qc = useQueryClient();
  const handleMouseEnter = () => {
    void qc.prefetchQuery({
      queryKey: assetQueryKeys.lifecycle(asset.id),
      queryFn: () => assetsApi.listLifecycle(asset.id),
      staleTime: 5 * 60 * 1000,
    });
  };

  return (
    <tr
      onClick={() => onSelect(asset)}
      onMouseEnter={handleMouseEnter}
      tabIndex={0}
      role="row"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(asset);
        }
      }}
      className={cn(
        "group border-b border-border bg-bg transition-colors duration-100 cursor-pointer",
        "hover:bg-bg-subtle/80 focus:outline-none focus-visible:bg-bg-subtle",
      )}
    >
      {/* Code */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <span className="font-mono text-xs font-bold text-text bg-bg-subtle px-2 py-1 rounded border border-border">
          {asset.assetCode}
        </span>
      </td>

      {/* Asset Name */}
      <td className="px-3 py-3.5">
        <span className="text-sm font-bold text-text group-hover:text-accent transition-colors block leading-tight">
          {asset.name}
        </span>
        <span className="text-xs text-text-secondary truncate block">
          {asset.serialNumber || asset.location}
        </span>
      </td>

      {/* Category Tag */}
      <td className="px-3 py-3.5 whitespace-nowrap">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
            categoryMeta.bg,
            categoryMeta.text,
          )}
        >
          <Tag className="h-2.5 w-2.5" />
          {categoryMeta.label}
        </span>
      </td>

      {/* Assignment Type */}
      <td className="px-3 py-3.5 whitespace-nowrap">
        <AssignmentTypeBadge type={asset.assignmentType} />
      </td>

      {/* Status Badge */}
      <td className="px-3 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {asset.currentHolder && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary text-white">
              {custodyBadgeLabel(asset.currentHolder, asset.assignmentType)}
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums",
              statusMeta.bg,
              statusMeta.text,
            )}
          >
            {statusMeta.label}
          </span>
        </div>
      </td>

      {/* Holder / Location */}
      <td className="px-3 py-3.5 text-xs">
        {asset.currentHolder ? (
          <span
            className="font-semibold text-text block truncate"
            title={asset.currentHolder}
          >
            {custodyDetailLabel(asset.currentHolder)}
            {asset.department ? ` (${asset.department})` : ""}
          </span>
        ) : (
          <span className="font-semibold text-status-active-text block">
            Available in Stock
          </span>
        )}
        <span className="text-text-secondary text-[11px] block truncate">
          {asset.location}
        </span>
      </td>

      {/* Last Updated */}
      <td className="px-3 py-3.5 text-xs text-text-secondary whitespace-nowrap hidden sm:table-cell">
        {asset.lastUpdated}
      </td>

      {/* Actions */}
      <td
        className="px-5 py-3.5 text-right whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onSelect(asset)}
            aria-label={`View details for ${asset.name}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-bg text-xs font-semibold text-text-secondary hover:text-text hover:border-primary transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden md:inline">View</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
