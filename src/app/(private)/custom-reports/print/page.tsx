"use client";

import { useEffect, useState } from "react";

import {
  CustomPrintableReport,
  type CustomPrintPayload,
} from "@/components/custom-reports/print/CustomPrintableReport";

export default function CustomReportPrintPage() {
  const [data, setData] = useState<CustomPrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("custom-report-print");
      if (!raw) {
        setError("No print payload found. Run a report and choose Print / PDF.");
        return;
      }
      setData(JSON.parse(raw) as CustomPrintPayload);
    } catch {
      setError("Failed to load print payload.");
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [data]);

  if (error) {
    return <p className="p-6 text-sm text-text-secondary">{error}</p>;
  }
  if (!data) {
    return <p className="p-6 text-sm text-text-secondary">Preparing print view…</p>;
  }

  return <CustomPrintableReport data={data} />;
}
