"use client";

import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  Heading,
  FileText,
  Filter,
  Table,
  Building,
  UserCheck,
  Scissors,
  HelpCircle,
} from "lucide-react";

import type {
  CustomReportLayoutBlock,
  CustomReportLayoutBlockType,
} from "@/types/custom-reports";

const BLOCK_OPTIONS: Array<{
  type: CustomReportLayoutBlockType;
  label: string;
  icon: typeof Heading;
  description: string;
}> = [
  {
    type: "header",
    label: "Header",
    icon: Building,
    description: "Institutional logo, organization name, and subtitle banner",
  },
  {
    type: "title",
    label: "Title",
    icon: Heading,
    description: "Main document title and optional reporting period label",
  },
  {
    type: "text",
    label: "Text",
    icon: FileText,
    description: "Custom notes, disclaimers, or memo instructions",
  },
  {
    type: "filters_summary",
    label: "Filters Summary",
    icon: Filter,
    description: "Auto-generated list of applied runtime filter parameters",
  },
  {
    type: "table",
    label: "Data Table",
    icon: Table,
    description: "Primary grid rendering the selected report columns and rows",
  },
  {
    type: "footer",
    label: "Footer",
    icon: FileText,
    description: "Formal audit footnote and system generation stamp",
  },
  {
    type: "signatories",
    label: "Signatories",
    icon: UserCheck,
    description: "Approval blocks with signature lines, names, roles, and titles",
  },
  {
    type: "page_break",
    label: "Page Break",
    icon: Scissors,
    description: "Forces a clean page break for printing / PDF export",
  },
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
    if (type === "title") base.props = { title: "Report Title" };
    if (type === "text") base.props = { text: "" };
    if (type === "footer")
      base.props = { footerText: "Generated from CRMC AIMS Custom Reports" };
    if (type === "signatories") {
      base.props = {
        signatories: [
          { name: "", role: "Prepared by", title: "" },
          { name: "", role: "Noted by", title: "" },
        ],
      };
    }
    onChange([...blocks, base]);
  };

  const addSignatory = (blockIndex: number) => {
    const current = blocks[blockIndex]?.props?.signatories ?? [];
    const next = [...current, { name: "", role: "Approved by", title: "" }];
    update(blockIndex, { props: { signatories: next } });
  };

  const removeSignatory = (blockIndex: number, sigIndex: number) => {
    const current = blocks[blockIndex]?.props?.signatories ?? [];
    const next = current.filter((_, i) => i !== sigIndex);
    update(blockIndex, { props: { signatories: next } });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Block insertion bar */}
      <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-bg-subtle/50">
        <span className="text-xs font-semibold text-text flex items-center gap-1.5">
          <Plus className="size-3.5 text-primary" />
          Add Layout Section:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {BLOCK_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => add(opt.type)}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-border bg-bg text-xs font-medium text-text hover:bg-bg-subtle hover:border-primary/40 transition-colors shadow-2xs"
                title={opt.description}
              >
                <Icon className="size-3 text-text-secondary" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {blocks.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-text-secondary">
          No layout blocks configured. Click the buttons above to structure your printable report (Header, Title, Table, and Footer recommended).
        </div>
      )}

      {/* Blocks sequence */}
      <ul className="flex flex-col gap-3">
        {blocks.map((block, index) => {
          const opt = BLOCK_OPTIONS.find((o) => o.type === block.type);
          const Icon = opt?.icon ?? FileText;

          return (
            <li
              key={block.id}
              className="rounded-xl border border-border bg-card p-3.5 flex flex-col gap-3 shadow-2xs transition-all hover:border-border/80"
            >
              {/* Block Header */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-bg-subtle text-text-secondary">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-text">
                    {opt?.label ?? block.type}
                  </span>
                  <span className="text-[10px] text-text-secondary hidden sm:inline">
                    · Block #{index + 1}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="p-1.5 rounded-md hover:bg-bg-subtle text-text-secondary hover:text-text disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={index === blocks.length - 1}
                    onClick={() => move(index, 1)}
                    className="p-1.5 rounded-md hover:bg-bg-subtle text-text-secondary hover:text-text disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove block"
                    onClick={() => remove(index)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors ml-1"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Block Content Inputs */}
              {block.type === "header" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-text-secondary block mb-1">
                        Logo URL (Optional Override)
                      </label>
                      <input
                        className="w-full h-8 rounded-lg border border-border bg-bg px-2.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Leave blank to use tenant logo"
                        value={block.props?.logoUrl ?? ""}
                        onChange={(e) =>
                          update(index, { props: { logoUrl: e.target.value } })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-text-secondary block mb-1">
                        Org Name Override
                      </label>
                      <input
                        className="w-full h-8 rounded-lg border border-border bg-bg px-2.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="e.g. Cotabato Regional and Medical Center"
                        value={block.props?.orgName ?? ""}
                        onChange={(e) =>
                          update(index, { props: { orgName: e.target.value } })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-text-secondary block mb-1">
                        Subtitle / Department Tagline
                      </label>
                      <input
                        className="w-full h-8 rounded-lg border border-border bg-bg px-2.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="e.g. Materials Management & Property Unit"
                        value={block.props?.orgSubtitle ?? ""}
                        onChange={(e) =>
                          update(index, { props: { orgSubtitle: e.target.value } })
                        }
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Defaults from active institutional branding when fields are empty.
                  </p>
                </div>
              )}

              {block.type === "title" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary block mb-1">
                      Report Document Title
                    </label>
                    <input
                      className="w-full h-8.5 rounded-lg border border-border bg-bg px-2.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="e.g. Physical Inventory of Equipment"
                      value={block.props?.title ?? ""}
                      onChange={(e) =>
                        update(index, { props: { title: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary block mb-1">
                      Period Label (Optional)
                    </label>
                    <input
                      className="w-full h-8.5 rounded-lg border border-border bg-bg px-2.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="e.g. As of 1st Quarter 2026"
                      value={block.props?.periodLabel ?? ""}
                      onChange={(e) =>
                        update(index, { props: { periodLabel: e.target.value } })
                      }
                    />
                  </div>
                </div>
              )}

              {block.type === "text" && (
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">
                    Narrative Text / Legal Disclaimer
                  </label>
                  <textarea
                    className="w-full min-h-[64px] rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter instructions, notes, or certification clauses..."
                    value={block.props?.text ?? ""}
                    onChange={(e) => update(index, { props: { text: e.target.value } })}
                  />
                </div>
              )}

              {block.type === "footer" && (
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">
                    Footer Text
                  </label>
                  <input
                    className="w-full h-8.5 rounded-lg border border-border bg-bg px-2.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Footer text or accreditation badge"
                    value={block.props?.footerText ?? ""}
                    onChange={(e) =>
                      update(index, { props: { footerText: e.target.value } })
                    }
                  />
                </div>
              )}

              {block.type === "signatories" && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-text-secondary">
                      Signatories ({block.props?.signatories?.length ?? 0}):
                    </span>
                    <button
                      type="button"
                      onClick={() => addSignatory(index)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Plus className="size-3" />
                      Add Signatory
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {(block.props?.signatories ?? []).map((sig, sigIdx) => (
                      <div
                        key={sigIdx}
                        className="p-2.5 rounded-lg border border-border bg-bg-subtle/40 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                      >
                        <div className="sm:col-span-4">
                          <label className="text-[10px] text-text-secondary block mb-0.5">
                            Full Name
                          </label>
                          <input
                            className="w-full h-7.5 rounded-md border border-border bg-bg px-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                            placeholder="e.g. JUAN DELA CRUZ, MD"
                            value={sig.name}
                            onChange={(e) => {
                              const next = [...(block.props?.signatories ?? [])];
                              next[sigIdx] = { ...sig, name: e.target.value.toUpperCase() };
                              update(index, { props: { signatories: next } });
                            }}
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="text-[10px] text-text-secondary block mb-0.5">
                            Action Role
                          </label>
                          <input
                            className="w-full h-7.5 rounded-md border border-border bg-bg px-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="e.g. Prepared by / Verified by"
                            value={sig.role}
                            onChange={(e) => {
                              const next = [...(block.props?.signatories ?? [])];
                              next[sigIdx] = { ...sig, role: e.target.value };
                              update(index, { props: { signatories: next } });
                            }}
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-text-secondary block mb-0.5">
                            Official Designation
                          </label>
                          <input
                            className="w-full h-7.5 rounded-md border border-border bg-bg px-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="e.g. Property Custodian"
                            value={sig.title ?? ""}
                            onChange={(e) => {
                              const next = [...(block.props?.signatories ?? [])];
                              next[sigIdx] = { ...sig, title: e.target.value };
                              update(index, { props: { signatories: next } });
                            }}
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end sm:pt-4">
                          <button
                            type="button"
                            onClick={() => removeSignatory(index, sigIdx)}
                            className="p-1 rounded text-text-secondary hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remove signatory"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(block.type === "filters_summary" ||
                block.type === "table" ||
                block.type === "page_break") && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-subtle/50 text-xs text-text-secondary">
                  <HelpCircle className="size-3.5 text-text-secondary shrink-0" />
                  <span>
                    {block.type === "filters_summary" &&
                      "Automatically items all filters active at runtime (departments, dates, classifications, etc.)."}
                    {block.type === "table" &&
                      "Renders the primary data table using your selected columns and sort order."}
                    {block.type === "page_break" &&
                      "Inserts a page break rule for clean separation when printing or generating PDFs."}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
