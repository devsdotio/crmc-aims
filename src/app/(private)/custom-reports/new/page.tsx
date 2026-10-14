"use client";

import { CustomReportTemplateDesigner } from "@/components/custom-reports/template-designer";

export default function NewCustomReportPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-4">
      <CustomReportTemplateDesigner mode="create" />
    </div>
  );
}
