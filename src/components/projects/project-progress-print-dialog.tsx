"use client";

import { useEffect, useMemo } from "react";
import { X, Printer, CheckCircle2, Clock, CircleAlert, Flag } from "lucide-react";
import type { Project, ProjectProgressIndicator, ProjectProgressSummary } from "@/types/projects";
import { cn } from "@/lib/utils";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatChedDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mon = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${mon}-${year}`;
}

export function ProjectProgressPrintDialog({
  project,
  progress,
  isOpen,
  onClose,
}: {
  project: Project | null;
  progress: ProjectProgressSummary | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const indicators = useMemo(
    () => progress?.indicators ?? [],
    [progress]
  );
  const total = progress?.totalIndicators ?? indicators.length;
  const completed = progress?.completedIndicators ?? indicators.filter((i) => i.isCompleted).length;
  const pending = progress?.pendingIndicators ?? total - completed;
  const progressPercent = progress?.progressPercentage ?? (total > 0 ? Math.round((completed / total) * 100) : 0);

  if (!isOpen || !project) return null;

  const handlePrint = () => {
    const logoUrl = `${window.location.origin}/CRMC%20LOGO.png`;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const controlNo = `CRMC-CUST-PRJ-PROG-${project.projectCode}`;
    const printDate = formatChedDate(new Date().toISOString().slice(0, 10));

    const rowsHtml =
      indicators.length === 0
        ? `<tr><td colspan="7" class="empty">No progress indicators or milestones recorded yet for this project.</td></tr>`
        : indicators
            .map((item, idx) => {
              const statusBadge = item.isCompleted
                ? `<span class="badge completed">COMPLETED</span>`
                : `<span class="badge pending">PENDING</span>`;
              const desc = item.description?.trim()
                ? `<div class="sub">${escapeHtml(item.description.trim())}</div>`
                : "";
              const completedDate = item.isCompleted && item.completedDate
                ? escapeHtml(formatChedDate(item.completedDate))
                : "—";
              const accountablePerson = item.isCompleted && item.completedByName
                ? escapeHtml(item.completedByName)
                : escapeHtml(project.createdByName || "[TO BE FILLED]");

              return `<tr>
                <td class="col-no">${idx + 1}</td>
                <td class="col-title">
                  <strong>${escapeHtml(item.title)}</strong>
                  ${desc}
                </td>
                <td class="col-date">${escapeHtml(formatChedDate(item.targetDate))}</td>
                <td class="col-date">${completedDate}</td>
                <td class="col-status">${statusBadge}</td>
                <td class="col-accountable">${accountablePerson}</td>
                <td class="col-remarks">${item.isCompleted ? "Verified Delivered" : "In Progress"}</td>
              </tr>`;
            })
            .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>CRMC-AIMS — Custodian Project Progress Report — ${escapeHtml(project.projectCode)}</title>
  <style>
    @page { size: 14in 8.5in; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10px; line-height: 1.35; color: #000000; margin: 0; padding: 0; background: #ffffff; vertical-align: top; display: flex; flex-direction: column; justify-content: flex-start; }
    
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 10px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-left img { width: 44px; height: 44px; object-fit: contain; }
    .brand-title { font-size: 13px; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.5px; }
    .brand-office { font-size: 10.5px; font-weight: 700; color: #000000; text-transform: uppercase; }
    .brand-loc { font-size: 8.5px; color: #000000; }
    .header-meta { text-align: right; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 8.5px; color: #000000; background: #ffffff; border: 1px solid #000000; border-radius: 2px; padding: 4px 8px; }
    .header-meta strong { color: #000000; }
    
    .doc-banner { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #000000; padding-bottom: 6px; margin-bottom: 10px; }
    .doc-banner h1 { margin: 0; font-size: 13px; font-weight: 900; letter-spacing: 0.4px; text-transform: uppercase; color: #000000; }
    .doc-banner .subtext { font-size: 9px; color: #000000; margin-top: 2px; }
    .doc-banner .standard-tag { font-family: ui-monospace, monospace; font-size: 8.5px; font-weight: 700; color: #000000; }

    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 12px; margin-bottom: 10px; padding: 6px 10px; background: #ffffff; border: 1px solid #000000; border-radius: 2px; font-size: 9px; }
    .meta-item { display: flex; flex-direction: column; }
    .meta-item .lbl { font-weight: 700; color: #000000; text-transform: uppercase; font-size: 8px; }
    .meta-item .val { font-weight: 600; color: #000000; margin-top: 1px; }

    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
    .kpi-card { border: 1px solid #000000; border-radius: 2px; padding: 6px 8px; text-align: center; background: #ffffff; }
    .kpi-label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #000000; letter-spacing: 0.4px; }
    .kpi-val { font-size: 15px; font-weight: 800; font-family: ui-monospace, monospace; margin-top: 1px; color: #000000; }
    .kpi-val.accent { color: #000000; }
    .kpi-val.success { color: #000000; }
    .kpi-val.pending { color: #000000; }

    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9px; border: 1.5px solid #000000; break-inside: auto; }
    tr { break-inside: auto; page-break-inside: auto; }
    thead { break-inside: avoid; break-after: avoid; page-break-after: avoid; display: table-header-group; }
    th { background: #ffffff; color: #000000; font-weight: 800; text-transform: uppercase; font-size: 8px; letter-spacing: 0.4px; padding: 5px 6px; border: 1px solid #000000; text-align: center; }
    td { padding: 4px 6px; border: 1px solid #000000; vertical-align: top; color: #000000; }
    tr:nth-child(even) td { background: #ffffff; }
    
    .col-no { width: 28px; text-align: center; font-family: ui-monospace, monospace; color: #000000; font-weight: 700; }
    .col-title { min-width: 170px; text-align: left; }
    .col-date { width: 85px; text-align: center; font-family: ui-monospace, monospace; }
    .col-status { width: 80px; text-align: center; }
    .col-accountable { width: 130px; text-align: left; }
    .col-remarks { width: 90px; text-align: left; font-size: 8px; color: #000000; }
    
    .sub { font-size: 8px; color: #000000; margin-top: 1px; }
    .empty { text-align: center; padding: 16px; color: #000000; font-style: italic; }

    .badge { display: inline-block; padding: 1.5px 5px; border-radius: 2px; font-size: 7.5px; font-weight: 800; letter-spacing: 0.3px; border: 1px solid #000000; color: #000000; background: transparent; }
    .badge.completed { background: transparent; color: #000000; border: 1px solid #000000; }
    .badge.pending { background: transparent; color: #000000; border: 1px solid #000000; }

    .signatories { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 20px; padding-top: 8px; border-top: 1px solid #000000; page-break-inside: avoid; }
    .sig-box { text-align: left; }
    .sig-role { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #000000; margin-bottom: 24px; }
    .sig-line { border-bottom: 1px solid #000000; margin-bottom: 3px; }
    .sig-name { font-size: 9px; font-weight: 700; color: #000000; text-transform: uppercase; }
    .sig-title { font-size: 8px; color: #000000; }
    .sig-date { font-size: 7.5px; color: #000000; font-family: ui-monospace, monospace; margin-top: 1px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${logoUrl}" alt="CRMC Logo" />
      <div>
        <div class="brand-title">Cebu Roosevelt Memorial Colleges, Inc.</div>
        <div class="brand-office">Property Custodian Office</div>
        <div class="brand-loc">Upper Pandan, Bogo City, Cebu, Philippines 6010 · aims@crmc.edu.ph</div>
      </div>
    </div>
    <div class="header-meta">
      <div>Control No: <strong>${escapeHtml(controlNo)}</strong></div>
      <div>Date: <strong>${printDate}</strong></div>
    </div>
  </div>

  <div class="doc-banner">
    <div>
      <h1>Custodian Report on Project Progress &amp; Physical Milestones</h1>
      <div class="subtext">
        Project: <strong>${escapeHtml(project.projectCode)}</strong> — ${escapeHtml(project.name)} · 
        Department: ${escapeHtml(project.department || "General")} · 
        Location: ${escapeHtml(project.location || "—")}
      </div>
    </div>
    <div class="standard-tag">CHED HEI CUSTODIAN STANDARD</div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><span class="lbl">Date Started:</span><span class="val">${escapeHtml(formatChedDate(project.startDate))}</span></div>
    <div class="meta-item"><span class="lbl">Target Completion:</span><span class="val">${escapeHtml(formatChedDate(project.endDate))}</span></div>
    <div class="meta-item"><span class="lbl">Accountable Person:</span><span class="val">${escapeHtml(project.createdByName || "[TO BE FILLED]")}</span></div>
    <div class="meta-item"><span class="lbl">Project Status:</span><span class="val">${escapeHtml(project.status.toUpperCase())}</span></div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-label">Physical Progress Rate</div>
      <div class="kpi-val accent">${progressPercent}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Milestone Indicators</div>
      <div class="kpi-val">${total}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Completed Milestones</div>
      <div class="kpi-val success">${completed}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Pending / In-Progress</div>
      <div class="kpi-val pending">${pending}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-no">Item No.</th>
        <th class="col-title">Progress Indicator / Milestone Description</th>
        <th class="col-date">Target Date</th>
        <th class="col-date">Actual Completion</th>
        <th class="col-status">Status</th>
        <th class="col-accountable">Accountable Person</th>
        <th class="col-remarks">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="signatories">
    <div class="sig-box">
      <div class="sig-role">Prepared by:</div>
      <div class="sig-line"></div>
      <div class="sig-name">${escapeHtml(project.createdByName || "Property Custodian Staff")}</div>
      <div class="sig-title">Project Lead / Custodian Staff</div>
      <div class="sig-date">Date: ____________________</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">Reviewed by:</div>
      <div class="sig-line"></div>
      <div class="sig-name">Internal Auditor / Planning</div>
      <div class="sig-title">Audit &amp; Inspection Committee</div>
      <div class="sig-date">Date: ____________________</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">Certified Correct by:</div>
      <div class="sig-line"></div>
      <div class="sig-name">Head Property Custodian</div>
      <div class="sig-title">Physical Plant &amp; Custodial Services</div>
      <div class="sig-date">Date: ____________________</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">Approved by:</div>
      <div class="sig-line"></div>
      <div class="sig-name">VP for Administration / President</div>
      <div class="sig-title">College Executive Administration</div>
      <div class="sig-date">Date: ____________________</div>
    </div>
  </div>
</body>
</html>`;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="progress-report-heading"
        className="relative w-full max-w-4xl bg-bg border border-border rounded-xl shadow-2xl z-10 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
              <Flag className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="progress-report-heading"
                className="text-sm font-bold text-text"
              >
                Project Progress Report
              </h2>
              <p className="text-[11px] text-text-secondary">
                {project.projectCode} · {project.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-4 gap-2.5 text-center">
            <div className="p-3 rounded-xl border border-border bg-bg-subtle/40">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                Progress
              </div>
              <div className="text-xl font-black font-mono text-accent mt-0.5">
                {progressPercent}%
              </div>
            </div>
            <div className="p-3 rounded-xl border border-border bg-bg-subtle/40">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                Total
              </div>
              <div className="text-xl font-bold font-mono text-text mt-0.5">
                {total}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-border bg-bg-subtle/40">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                Completed
              </div>
              <div className="text-xl font-bold font-mono text-status-active-text mt-0.5">
                {completed}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-border bg-bg-subtle/40">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                Pending
              </div>
              <div className="text-xl font-bold font-mono text-status-warning-text mt-0.5">
                {pending}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-text">
              <span>Overall Milestone Completion</span>
              <span className="font-mono text-accent">{progressPercent}%</span>
            </div>
            <div className="w-full bg-border rounded-full h-3 overflow-hidden">
              <div
                className="bg-accent h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Milestone &amp; Indicator Checklist
            </h3>

            {indicators.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-border bg-bg-subtle/30 text-xs text-text-secondary">
                No progress indicators added yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {indicators.map((item, idx) => (
                  <li
                    key={item.id}
                    className="p-3 rounded-xl border border-border bg-bg-subtle/30 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">
                        {item.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-status-active-text" />
                        ) : (
                          <Clock className="h-4 w-4 text-status-warning-text" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] text-text-secondary">
                            #{idx + 1}
                          </span>
                          <span
                            className={cn(
                              "font-bold text-text",
                              item.isCompleted && "line-through text-text-secondary"
                            )}
                          >
                            {item.title}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
                              item.isCompleted
                                ? "bg-status-active-bg/15 text-status-active-text border-status-active-bg/25"
                                : "bg-status-warning-bg/15 text-status-warning-text border-status-warning-bg/25"
                            )}
                          >
                            {item.isCompleted ? "COMPLETED" : "PENDING"}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-text-secondary mt-1 whitespace-pre-wrap">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-text-secondary mt-1 flex-wrap">
                          {item.targetDate && (
                            <span>Target: {formatChedDate(item.targetDate)}</span>
                          )}
                          {item.isCompleted && item.completedDate && (
                            <span>
                              Completed: {formatChedDate(item.completedDate)}
                              {item.completedByName ? ` by ${item.completedByName}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-border bg-bg-subtle/50 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
