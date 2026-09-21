"use client";

import { Wrench } from "lucide-react";
import type { MaintenanceLogRecord } from "@/types/maintenance-logs";
import { MaintenanceLogTableRow } from "./maintenance-log-list-item";

export interface MaintenanceLogListProps {
  records: MaintenanceLogRecord[];
  loading?: boolean;
  onSelect: (record: MaintenanceLogRecord) => void;
  onResolve?: (record: MaintenanceLogRecord) => void;
}

function SkeletonTableRow() {
  return (
    <tr className="border-b border-border bg-bg animate-pulse">
      <td className="px-5 py-4">
        <div className="h-4 w-24 bg-border rounded mb-1" />
        <div className="h-3 w-16 bg-border rounded" />
      </td>
      <td className="px-3 py-4">
        <div className="h-4 w-40 bg-border rounded mb-1" />
        <div className="h-3 w-20 bg-border rounded" />
      </td>
      <td className="px-3 py-4 hidden md:table-cell">
        <div className="h-5 w-20 bg-border rounded-full" />
      </td>
      <td className="px-3 py-4">
        <div className="h-5 w-28 bg-border rounded-full" />
      </td>
      <td className="px-3 py-4 hidden lg:table-cell">
        <div className="h-3.5 w-24 bg-border rounded" />
      </td>
      <td className="px-3 py-4 hidden sm:table-cell">
        <div className="h-3.5 w-48 bg-border rounded" />
      </td>
      <td className="px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <div className="h-7 w-14 bg-border rounded" />
          <div className="h-7 w-16 bg-border rounded" />
        </div>
      </td>
    </tr>
  );
}

const TABLE_HEADERS = (
  <tr className="border-b border-border bg-bg-subtle text-[11px] font-bold uppercase tracking-wider text-text-secondary">
    <th scope="col" className="px-5 py-3">
      Log
    </th>
    <th scope="col" className="px-3 py-3">
      Asset
    </th>
    <th scope="col" className="px-3 py-3 hidden md:table-cell">
      Category
    </th>
    <th scope="col" className="px-3 py-3">
      Condition
    </th>
    <th scope="col" className="px-3 py-3 hidden lg:table-cell">
      Source
    </th>
    <th scope="col" className="px-3 py-3 hidden sm:table-cell">
      Notes
    </th>
    <th scope="col" className="px-5 py-3 text-right">
      <span className="sr-only">Actions</span>
    </th>
  </tr>
);

export function MaintenanceLogList({
  records,
  loading = false,
  onSelect,
  onResolve,
}: MaintenanceLogListProps) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-sm"
          aria-label="Maintenance logs loading"
        >
          <thead>{TABLE_HEADERS}</thead>
          <tbody>
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-status-repair-bg/10 border border-status-repair-bg/25 text-status-repair-text shadow-xs">
          <Wrench className="h-7 w-7" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="text-base font-bold text-text">
            No maintenance logs found
          </h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
            No entries match your current search, category, or condition
            filters. Flag an asset when it needs repair.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-left text-sm"
        aria-label="Condition and maintenance logs"
      >
        <thead>
          <tr className="border-b border-border bg-bg-subtle text-[11px] font-bold uppercase tracking-wider text-text-secondary sticky top-0 z-10 shadow-2xs">
            <th scope="col" className="px-5 py-3">
              Log
            </th>
            <th scope="col" className="px-3 py-3">
              Asset
            </th>
            <th scope="col" className="px-3 py-3 hidden md:table-cell">
              Category
            </th>
            <th scope="col" className="px-3 py-3">
              Condition
            </th>
            <th scope="col" className="px-3 py-3 hidden lg:table-cell">
              Source
            </th>
            <th scope="col" className="px-3 py-3 hidden sm:table-cell">
              Notes
            </th>
            <th scope="col" className="px-5 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((record) => (
            <MaintenanceLogTableRow
              key={record.id}
              record={record}
              onSelect={onSelect}
              onResolve={onResolve}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
