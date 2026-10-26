import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomPrintableReport } from "@/components/custom-reports/print/CustomPrintableReport";
import type { CustomPrintPayload } from "@/lib/custom-reports/print-payload";

describe("CustomPrintableReport signatories", () => {
  it("renders signatories names in uppercase / capslock", () => {
    const payload: CustomPrintPayload = {
      templateName: "Test Report",
      columns: [{ key: "id", label: "ID" }],
      rows: [{ id: "1" }],
      total: 1,
      page: 1,
      pageSize: 50,
      filters: {},
      layout: [
        {
          id: "sig-1",
          type: "signatories",
          props: {
            signatories: [
              { name: "Juan dela Cruz, MD", role: "Prepared by", title: "Chief Medical Officer" },
              { name: "maria santos", role: "Approved by" },
            ],
          },
        },
      ],
      createdAt: Date.now(),
    };

    const html = renderToStaticMarkup(React.createElement(CustomPrintableReport, { data: payload }));
    expect(html).toContain("JUAN DELA CRUZ, MD");
    expect(html).toContain("MARIA SANTOS");
    expect(html).not.toContain("Juan dela Cruz, MD");
    expect(html).not.toContain("maria santos");
    expect(html).toContain("signatory-name");
    expect(html).toContain("uppercase");
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("text-center");
    expect(html).toContain("signature-line");
    expect(html).toContain("max-w-[220px]");
  });
});
