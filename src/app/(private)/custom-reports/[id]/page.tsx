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
    <div className="w-full">
      <CustomReportTemplateDesigner mode="edit" templateId={id} />
    </div>
  );
}
