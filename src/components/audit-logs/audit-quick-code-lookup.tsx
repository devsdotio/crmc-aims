"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  X,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
  History,
  QrCode,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssetsQuery } from "@/features/assets/client";
import { useConsumablesQuery } from "@/features/consumables/client/use-consumables";
import { AssetAuditDetailPanel } from "./asset-audit-detail-panel";
import { ConsumableAuditDetailPanel } from "./consumable-audit-detail-panel";
import { getCategoryStyle } from "@/constants/categories";
import { LoadingState } from "@/components/providers/loading-context";
import type { Asset } from "@/types/assets";
import type { ConsumableItem } from "@/features/consumables/client/consumables-api";

export function AuditQuickCodeLookup() {
  const [query, setQuery] = useState("");
  const [isOpenResults, setIsOpenResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: assets = [], isLoading: isAssetsLoading } = useAssetsQuery();
  const { data: consumableResponse, isLoading: isConsumablesLoading } = useConsumablesQuery({ limit: 100 });
  const consumables = useMemo(
    () => consumableResponse?.data ?? [],
    [consumableResponse?.data]
  );

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedConsumable, setSelectedConsumable] = useState<ConsumableItem | null>(null);

  // Close results popup on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpenResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter matching assets and consumables by code or name
  const { matchedAssets, matchedConsumables, exactMatch } = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return { matchedAssets: [], matchedConsumables: [], exactMatch: null };
    }

    const mAssets = assets.filter(
      (a) =>
        a.assetCode.toLowerCase().includes(trimmed) ||
        a.name.toLowerCase().includes(trimmed) ||
        a.serialNumber?.toLowerCase().includes(trimmed)
    );

    const mConsumables = consumables.filter(
      (c) =>
        c.itemCode.toLowerCase().includes(trimmed) ||
        c.name.toLowerCase().includes(trimmed)
    );

    // Check for exact code match
    const exactAsset = assets.find((a) => a.assetCode.toLowerCase() === trimmed);
    const exactConsumable = consumables.find((c) => c.itemCode.toLowerCase() === trimmed);

    let exact: { type: "asset"; data: Asset } | { type: "consumable"; data: ConsumableItem } | null = null;
    if (exactAsset) exact = { type: "asset", data: exactAsset };
    else if (exactConsumable) exact = { type: "consumable", data: exactConsumable };

    return {
      matchedAssets: mAssets.slice(0, 6),
      matchedConsumables: mConsumables.slice(0, 6),
      exactMatch: exact,
    };
  }, [query, assets, consumables]);

  const totalMatches = matchedAssets.length + matchedConsumables.length;

  const handleInspectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsOpenResults(false);
  };

  const handleInspectConsumable = (consumable: ConsumableItem) => {
    setSelectedConsumable(consumable);
    setIsOpenResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (exactMatch) {
        if (exactMatch.type === "asset") handleInspectAsset(exactMatch.data);
        else handleInspectConsumable(exactMatch.data);
      } else if (matchedAssets.length === 1 && matchedConsumables.length === 0) {
        handleInspectAsset(matchedAssets[0]);
      } else if (matchedConsumables.length === 1 && matchedAssets.length === 0) {
        handleInspectConsumable(matchedConsumables[0]);
      } else if (totalMatches > 0) {
        setIsOpenResults(true);
      }
    } else if (e.key === "Escape") {
      setIsOpenResults(false);
    }
  };

  return (
    <>
      <div ref={containerRef} className="relative w-full max-w-2xl">
        {/* Code Input Field */}
        <div className="relative flex items-center">
          <div className="absolute left-3.5 flex items-center pointer-events-none text-text-secondary">
            <Search className="h-4 w-4 text-accent" />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpenResults(true);
            }}
            onFocus={() => {
              if (query.trim()) setIsOpenResults(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Quick code lookup (e.g. AST-2026-0001, CON-2026-0001)..."
            className={cn(
              "w-full pl-10 pr-24 py-2.5 text-xs font-medium bg-bg border border-border rounded-xl",
              "placeholder:text-text-secondary/60 text-text shadow-xs",
              "focus:outline-hidden focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
            )}
          />

          <div className="absolute right-2.5 flex items-center gap-1.5">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setIsOpenResults(false);
                }}
                className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (exactMatch) {
                  if (exactMatch.type === "asset") handleInspectAsset(exactMatch.data);
                  else handleInspectConsumable(exactMatch.data);
                } else {
                  setIsOpenResults(true);
                }
              }}
              disabled={!query.trim()}
              className={cn(
                "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                query.trim()
                  ? "bg-accent text-accent-contrast shadow-xs hover:opacity-90"
                  : "bg-bg-subtle text-text-secondary border border-border opacity-60 cursor-not-allowed"
              )}
            >
              <span>Inspect</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Live Matching Results Dropdown Popup */}
        {isOpenResults && query.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-bg border border-border rounded-xl shadow-xl z-40 max-h-96 overflow-y-auto divide-y divide-border animate-in fade-in zoom-in-95 duration-150">
            {(isAssetsLoading || isConsumablesLoading) && totalMatches === 0 ? (
              <div className="p-4">
                <LoadingState
                  variant="inline"
                  icon="spinner"
                  message="Searching inventory codes..."
                  subtitle="Filtering active assets and stock consumables"
                />
              </div>
            ) : totalMatches === 0 ? (
              <div className="p-5 text-center text-xs text-text-secondary">
                <Search className="h-8 w-8 mx-auto text-text-secondary/30 mb-2" />
                <p className="font-semibold text-text">No matching code found for &ldquo;{query}&rdquo;</p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Check if the asset code (e.g. <code className="font-mono bg-bg-subtle px-1 py-0.5 rounded">AST-2026-0001</code>) or consumable code is correct.
                </p>
              </div>
            ) : (
              <>
                {/* Matched Assets Section */}
                {matchedAssets.length > 0 && (
                  <div className="p-2 space-y-1">
                    <div className="px-2.5 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-accent" />
                        Assets ({matchedAssets.length})
                      </span>
                    </div>

                    {matchedAssets.map((asset) => {
                      const catStyle = getCategoryStyle(asset.category);
                      const isBorrowed = Boolean(asset.currentHolder);

                      return (
                        <div
                          key={asset.id}
                          onClick={() => handleInspectAsset(asset)}
                          className="px-3 py-2 rounded-lg hover:bg-bg-subtle flex items-center justify-between gap-3 cursor-pointer group transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-text bg-bg-subtle px-1.5 py-0.5 rounded border border-border group-hover:border-accent/40">
                                {asset.assetCode}
                              </span>
                              <span className="font-semibold text-xs text-text truncate">
                                {asset.name}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-px text-[9px] font-bold uppercase",
                                  catStyle.bg,
                                  catStyle.text
                                )}
                              >
                                {catStyle.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                              Location: {asset.location} {asset.currentHolder && `• Holder: ${asset.currentHolder}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                                isBorrowed
                                  ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                                  : asset.status === "active"
                                  ? "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                                  : "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30"
                              )}
                            >
                              {isBorrowed ? "Borrowed" : asset.status.replace(/_/g, " ")}
                            </span>
                            <span className="text-accent text-[11px] font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              View Logs <ExternalLink className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Matched Consumables Section */}
                {matchedConsumables.length > 0 && (
                  <div className="p-2 space-y-1 bg-bg-subtle/30">
                    <div className="px-2.5 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-accent" />
                        Consumables ({matchedConsumables.length})
                      </span>
                    </div>

                    {matchedConsumables.map((con) => {
                      const catStyle = getCategoryStyle(con.category);
                      const isLow = con.currentQty <= con.minThreshold;

                      return (
                        <div
                          key={con.id}
                          onClick={() => handleInspectConsumable(con)}
                          className="px-3 py-2 rounded-lg hover:bg-bg-subtle flex items-center justify-between gap-3 cursor-pointer group transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-text bg-bg px-1.5 py-0.5 rounded border border-border group-hover:border-accent/40">
                                {con.itemCode}
                              </span>
                              <span className="font-semibold text-xs text-text truncate">
                                {con.name}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-px text-[9px] font-bold uppercase",
                                  catStyle.bg,
                                  catStyle.text
                                )}
                              >
                                {catStyle.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                              Stock: <strong className="text-text">{con.currentQty} {con.unit}</strong> • Location: {con.location}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                                con.currentQty === 0
                                  ? "bg-status-outofservice-bg/20 text-status-outofservice-text border-status-outofservice-bg/30"
                                  : isLow
                                  ? "bg-status-repair-bg/20 text-status-repair-text border-status-repair-bg/30"
                                  : "bg-status-active-bg/20 text-status-active-text border-status-active-bg/30"
                              )}
                            >
                              {con.currentQty === 0 ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                            </span>
                            <span className="text-accent text-[11px] font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              View Movement Logs <ExternalLink className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Slide-over Inspection Drawers */}
      <AssetAuditDetailPanel
        asset={selectedAsset}
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
      />

      <ConsumableAuditDetailPanel
        consumable={selectedConsumable}
        isOpen={Boolean(selectedConsumable)}
        onClose={() => setSelectedConsumable(null)}
      />
    </>
  );
}
