"use client";

import React, { useState } from "react";
import { GripVertical, Layers, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  assignLineToPurposeGroup,
  newPurposeGroupDraft,
  removePurposeGroupDraft,
  type PurposeGroupDraft,
} from "@/lib/voucher-particulars";

type PurposeLine = {
  id: string;
  description: string;
  quantity: string;
};

interface PurposeGroupsFieldProps {
  groups: PurposeGroupDraft[];
  lines: PurposeLine[];
  onGroupsChange: (groups: PurposeGroupDraft[]) => void;
  locked?: boolean;
  disabled?: boolean;
  purposeInputId?: string;
}

export function PurposeGroupsField({
  groups,
  lines,
  onGroupsChange,
  locked = false,
  disabled = false,
  purposeInputId = "disbursement-purpose",
}: PurposeGroupsFieldProps) {
  const [dragLineId, setDragLineId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const readOnly = locked || disabled;
  const multi = groups.length > 1;

  const addPurpose = () => {
    if (readOnly) return;
    if (groups.length > 1) {
      onGroupsChange([...groups, newPurposeGroupDraft()]);
      return;
    }
    const lineIds = lines.map((line) => line.id);
    const first = groups[0] ?? newPurposeGroupDraft("", lineIds);
    onGroupsChange([
      {
        ...first,
        lineIds: first.lineIds.length > 0 ? first.lineIds : lineIds,
      },
      newPurposeGroupDraft(),
    ]);
  };

  if (!multi) {
    const group = groups[0];
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-0.5 gap-2">
          <label
            htmlFor={purposeInputId}
            className="text-xs font-semibold text-text"
          >
            Purpose
          </label>
          {locked ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <Lock className="h-3 w-3" />
              From linked PO
            </span>
          ) : (
            <button
              type="button"
              onClick={addPurpose}
              disabled={disabled}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              Add purpose
            </button>
          )}
        </div>
        <textarea
          id={purposeInputId}
          rows={3}
          value={group?.purpose ?? ""}
          onChange={(e) => {
            if (!group || readOnly) return;
            onGroupsChange([{ ...group, purpose: e.target.value }]);
          }}
          placeholder="e.g. Office replenishment, PO settlement, emergency purchase"
          aria-describedby={`${purposeInputId}-hint`}
          readOnly={locked}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-border bg-bg p-3 text-sm text-text placeholder:text-text-secondary/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none disabled:opacity-70",
            locked && "cursor-not-allowed opacity-75 bg-bg-subtle"
          )}
        />
        <p id={`${purposeInputId}-hint`} className="text-[11px] text-text-secondary">
          {locked
            ? "Taken from the linked purchase order until the PO link is cleared."
            : "Optional. Add another purpose when line items need different justifications."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text">
              Purposes ({groups.length})
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {locked
                ? "Copied from the linked purchase order. Clear the PO link to edit them."
                : "Drag line items between purposes. Every line stays under a purpose."}
            </p>
          </div>
        </div>
        {locked ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <Lock className="h-3 w-3" />
            From linked PO
          </span>
        ) : (
          <button
            type="button"
            onClick={addPurpose}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Add purpose
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 min-h-48">
        {groups.map((group, groupIdx) => {
          const assigned = lines.filter((line) => group.lineIds.includes(line.id));
          const isOver = dropTargetId === group.id;
          return (
            <div
              key={group.id}
              onDragOver={(e) => {
                if (readOnly) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dropTargetId !== group.id) setDropTargetId(group.id);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                if (dropTargetId === group.id) setDropTargetId(null);
              }}
              onDrop={(e) => {
                if (readOnly) return;
                e.preventDefault();
                const lineId = e.dataTransfer.getData("text/plain") || dragLineId;
                if (lineId) {
                  onGroupsChange(assignLineToPurposeGroup(groups, group.id, lineId));
                }
                setDragLineId(null);
                setDropTargetId(null);
              }}
              className={cn(
                "w-52 sm:w-56 shrink-0 rounded-xl border bg-bg flex flex-col overflow-hidden transition-colors",
                isOver
                  ? "border-indigo-500/50 ring-2 ring-indigo-500/20 bg-indigo-500/5"
                  : "border-border"
              )}
            >
              <div className="px-2.5 py-2 border-b border-indigo-500/20 bg-indigo-500/5 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    Purpose {groupIdx + 1} ({assigned.length})
                    {!locked && (
                      <span className="text-rose-600 normal-case tracking-normal"> *</span>
                    )}
                  </p>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onGroupsChange(removePurposeGroupDraft(groups, group.id))
                      }
                      className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  value={group.purpose}
                  onChange={(e) => {
                    const value = e.target.value;
                    onGroupsChange(
                      groups.map((entry) =>
                        entry.id === group.id ? { ...entry, purpose: value } : entry
                      )
                    );
                  }}
                  onDragOver={(e) => e.stopPropagation()}
                  readOnly={locked}
                  disabled={disabled}
                  placeholder={
                    groupIdx === 0
                      ? "Purpose — e.g. office replenishment…"
                      : "Purpose text…"
                  }
                  rows={2}
                  aria-required={!locked}
                  className={cn(
                    "w-full p-1.5 rounded-md border border-border bg-bg text-[11px] focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-hidden resize-none leading-relaxed disabled:opacity-70",
                    locked && "cursor-not-allowed opacity-75 bg-bg-subtle"
                  )}
                />
              </div>
              <div className="p-2 space-y-1.5 flex-1 min-h-28 max-h-52 overflow-y-auto">
                {assigned.length > 0 ? (
                  assigned.map((line) => (
                    <div
                      key={line.id}
                      draggable={!readOnly}
                      onDragStart={(e) => {
                        if (readOnly) return;
                        setDragLineId(line.id);
                        e.dataTransfer.setData("text/plain", line.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDragLineId(null);
                        setDropTargetId(null);
                      }}
                      className={cn(
                        "flex items-start gap-1.5 px-2 py-1.5 rounded-md border bg-card text-xs select-none shadow-2xs",
                        readOnly
                          ? "border-border"
                          : "cursor-grab active:cursor-grabbing border-border hover:border-accent/40",
                        dragLineId === line.id && "opacity-40 border-accent"
                      )}
                    >
                      {!readOnly && (
                        <GripVertical className="h-3.5 w-3.5 text-text-secondary shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-text truncate leading-snug">
                          {line.description.trim() || "Untitled line"}
                        </p>
                        <p className="text-[10px] text-text-secondary truncate">
                          Qty {line.quantity.trim() || "—"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-text-secondary px-1 py-6 text-center border border-dashed border-border/80 rounded-md">
                    {isOver ? "Drop here" : readOnly ? "No lines" : "Drag items here"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
