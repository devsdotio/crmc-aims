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
    <div className="w-full">
      <CustomReportRunner templateId={id} />
    </div>
  );
}
