"use client";

import { CustomReportTemplateDesigner } from "@/components/custom-reports/template-designer";

export default function NewCustomReportPage() {
  return (
    <div className="w-full">
      <CustomReportTemplateDesigner mode="create" />
    </div>
  );
}
