"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import type {
  CustomReportLayoutBlock,
  CustomReportLayoutBlockType,
} from "@/types/custom-reports";

const BLOCK_OPTIONS: Array<{ type: CustomReportLayoutBlockType; label: string }> = [
  { type: "header", label: "Header (logo / org)" },
  { type: "title", label: "Title" },
  { type: "text", label: "Text / description" },
  { type: "filters_summary", label: "Filters summary" },
  { type: "table", label: "Data table" },
  { type: "footer", label: "Footer" },
  { type: "signatories", label: "Signatories" },
  { type: "page_break", label: "Page break" },
];

function newId() {
  return `blk_${Math.random().toString(36).slice(2, 10)}`;
}

interface LayoutBlockEditorProps {
  blocks: CustomReportLayoutBlock[];
  onChange: (blocks: CustomReportLayoutBlock[]) => void;
}

export function LayoutBlockEditor({ blocks, onChange }: LayoutBlockEditorProps) {
  const move = (index: number, dir: -1 | 1) => {
    const next = [...blocks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const update = (index: number, patch: Partial<CustomReportLayoutBlock>) => {
    onChange(
      blocks.map((b, i) =>
        i === index
          ? {
              ...b,
              ...patch,
              props: { ...b.props, ...patch.props },
            }
          : b
      )
    );
  };

  const add = (type: CustomReportLayoutBlockType) => {
    const base: CustomReportLayoutBlock = { id: newId(), type, props: {} };
    if (type === "title") base.props = { title: "Report title" };
    if (type === "text") base.props = { text: "" };
    if (type === "footer") base.props = { footerText: "Generated from CRMC AIMS Custom Reports" };
    if (type === "signatories") {
      base.props = {
        signatories: [
          { name: "", role: "Prepared by" },
          { name: "", role: "Noted by" },
        ],
      };
    }
    onChange([...blocks, base]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-text-secondary">Add block</span>
        {BLOCK_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => add(opt.type)}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-bg text-xs text-text hover:bg-bg-subtle"
          >
            <Plus className="size-3" />
            {opt.label}
          </button>
        ))}
      </div>

      {blocks.length === 0 && (
        <p className="text-sm text-text-secondary">
          No layout blocks yet. Add a header, title, and table to start.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {blocks.map((block, index) => (
          <li
            key={block.id}
            className="rounded-lg border border-border bg-bg p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {BLOCK_OPTIONS.find((o) => o.type === block.type)?.label ?? block.type}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  onClick={() => move(index, -1)}
                  className="p-1 rounded hover:bg-bg-subtle text-text-secondary"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  onClick={() => move(index, 1)}
                  className="p-1 rounded hover:bg-bg-subtle text-text-secondary"
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Remove block"
                  onClick={() => remove(index)}
                  className="p-1 rounded hover:bg-bg-subtle text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>

            {block.type === "header" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  className="h-8 rounded-md border border-border bg-bg px-2 text-sm"
                  placeholder="Logo URL (optional override)"
                  value={block.props?.logoUrl ?? ""}
                  onChange={(e) => update(index, { props: { logoUrl: e.target.value } })}
                />
                <input
                  className="h-8 rounded-md border border-border bg-bg px-2 text-sm"
                  placeholder="Org name override"
                  value={block.props?.orgName ?? ""}
                  onChange={(e) => update(index, { props: { orgName: e.target.value } })}
                />
                <input
                  className="h-8 rounded-md border border-border bg-bg px-2 text-sm"
                  placeholder="Subtitle override"
                  value={block.props?.orgSubtitle ?? ""}
                  onChange={(e) => update(index, { props: { orgSubtitle: e.target.value } })}
                />
              </div>
            )}

            {block.type === "title" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className="h-8 rounded-md border border-border bg-bg px-2 text-sm"
                  placeholder="Report title"
                  value={block.props?.title ?? ""}
                  onChange={(e) => update(index, { props: { title: e.target.value } })}
                />
                <input
                  className="h-8 rounded-md border border-border bg-bg px-2 text-sm"
                  placeholder="Period label (optional)"
                  value={block.props?.periodLabel ?? ""}
                  onChange={(e) => update(index, { props: { periodLabel: e.target.value } })}
                />
              </div>
            )}

            {block.type === "text" && (
              <textarea
                className="min-h-[72px] rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
                placeholder="Description or notes shown on the report"
                value={block.props?.text ?? ""}
                onChange={(e) => update(index, { props: { text: e.target.value } })}
              />
            )}

            {block.type === "footer" && (
              <input
                className="h-8 rounded-md border border-border bg-bg px-2 text-sm"
                placeholder="Footer text"
                value={block.props?.footerText ?? ""}
                onChange={(e) => update(index, { props: { footerText: e.target.value } })}
              />
            )}

            {block.type === "signatories" && (
              <div className="flex flex-col gap-2">
                {(block.props?.signatories ?? []).map((sig, sigIdx) => (
                  <div key={sigIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      className="h-8 rounded-md border border-border bg-bg px-2 text-sm"
                      placeholder="Name"
                      value={sig.name}
                      onChange={(e) => {
                        const next = [...(block.props?.signatories ?? [])];
                        next[sigIdx] = { ...sig, name: e.target.value };
                        update(index, { props: { signatories: next } });
                      }}
                    />
                    <input
                      className="h-8 rounded-md border border-border bg-bg px-2 text-sm"
                      placeholder="Role"
                      value={sig.role}
                      onChange={(e) => {
                        const next = [...(block.props?.signatories ?? [])];
                        next[sigIdx] = { ...sig, role: e.target.value };
                        update(index, { props: { signatories: next } });
                      }}
                    />
                    <input
                      className="h-8 rounded-md border border-border bg-bg px-2 text-sm"
                      placeholder="Title (optional)"
                      value={sig.title ?? ""}
                      onChange={(e) => {
                        const next = [...(block.props?.signatories ?? [])];
                        next[sigIdx] = { ...sig, title: e.target.value };
                        update(index, { props: { signatories: next } });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {(block.type === "filters_summary" ||
              block.type === "table" ||
              block.type === "page_break") && (
              <p className="text-xs text-text-secondary">
                {block.type === "filters_summary" &&
                  "Automatically lists filters applied when the report is run."}
                {block.type === "table" && "Renders the selected data columns."}
                {block.type === "page_break" && "Forces a new page when printing."}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
