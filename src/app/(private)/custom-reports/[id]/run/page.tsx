"use client";

import { use } from "react";

import { CustomReportRunner } from "@/components/custom-reports/report-runner";

export default function RunCustomReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-4">
      <CustomReportRunner templateId={id} />
    </div>
  );
}
