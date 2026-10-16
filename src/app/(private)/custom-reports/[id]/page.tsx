"use client";

import { use } from "react";

import { CustomReportTemplateDesigner } from "@/components/custom-reports/template-designer";

export default function EditCustomReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-4">
      <CustomReportTemplateDesigner mode="edit" templateId={id} />
    </div>
  );
}
