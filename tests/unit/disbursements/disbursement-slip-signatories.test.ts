import { describe, expect, it } from "vitest";

import {
  buildDisbursementSlipBodyHtml,
  pettyCashToSlip,
  voucherToSlip,
  type DisbursementSlipData,
} from "@/components/disbursements/disbursement-official-slip";
import type { Voucher } from "@/types/vouchers";
import type { PettyCashVoucher } from "@/types/petty-cash";

const SIGNATORY_TITLES = [
  "Payee",
  "Property Custodian Staff",
  "Materials Control and Work Progress Staff",
] as const;

function sampleVoucher(overrides: Partial<Voucher> = {}): Voucher {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    voucherCode: "DRR2026-000001",
    type: "disbursement",
    status: "draft",
    voucherDate: "2026-10-01",
    payeeName: "Acme Supplies",
    amount: "1500.00",
    supplierId: null,
    supplierName: "Acme Supplies",
    purchaseOrderNumber: null,
    assetId: null,
    assetCode: null,
    assetName: null,
    purpose: "Office restock",
    particulars: JSON.stringify([
      {
        description: "Bond paper",
        quantity: "2",
        unitOfMeasure: "ream",
        unitCost: "250.00",
        amount: "500.00",
      },
    ]),
    checkNumber: null,
    departmentId: null,
    departmentName: null,
    isLegacy: false,
    createdByUserId: "22222222-2222-2222-2222-222222222222",
    createdByName: "Prep Staff",
    approvedByUserId: null,
    approvedByName: "Verifier",
    approvedAt: null,
    completedByUserId: null,
    completedByName: null,
    completedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

function samplePettyCash(
  overrides: Partial<PettyCashVoucher> = {}
): PettyCashVoucher {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    pcvNumber: "PCV2026-000001",
    status: "draft",
    voucherDate: "2026-10-01",
    payeeName: "Jane Claimant",
    amount: "350.00",
    category: "supplies",
    purpose: "Urgent supplies",
    particulars: JSON.stringify([
      {
        description: "Fasteners",
        quantity: "1",
        unitOfMeasure: "box",
        unitCost: "350.00",
        amount: "350.00",
      },
    ]),
    receiptNumber: null,
    supplierId: null,
    supplierName: null,
    purchaseOrderNumber: null,
    departmentId: null,
    departmentName: null,
    isLegacy: false,
    createdByUserId: "22222222-2222-2222-2222-222222222222",
    createdByName: "Prep Staff",
    approvedByUserId: null,
    approvedByName: "Verifier",
    approvedAt: null,
    completedByUserId: null,
    completedByName: null,
    completedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

function expectSignatoryTitles(html: string) {
  for (const title of SIGNATORY_TITLES) {
    expect(html).toContain(`class="sign-title">${title}</span>`);
  }
  const payeeIdx = html.indexOf(`class="sign-title">Payee</span>`);
  const custodianIdx = html.indexOf(
    `class="sign-title">Property Custodian Staff</span>`
  );
  const materialsIdx = html.indexOf(
    `class="sign-title">Materials Control and Work Progress Staff</span>`
  );
  expect(payeeIdx).toBeGreaterThan(-1);
  expect(custodianIdx).toBeGreaterThan(payeeIdx);
  expect(materialsIdx).toBeGreaterThan(custodianIdx);
}

describe("disbursement slip signatories", () => {
  it("places Payee / Property Custodian Staff / Materials Control titles under voucher signature lines", () => {
    const slip: DisbursementSlipData = voucherToSlip(
      sampleVoucher(),
      "https://example.test/logo.png"
    );
    const html = buildDisbursementSlipBodyHtml(slip);
    expectSignatoryTitles(html);
  });

  it("places the same signatory titles under petty cash signature lines", () => {
    const slip: DisbursementSlipData = pettyCashToSlip(
      samplePettyCash(),
      "https://example.test/logo.png"
    );
    const html = buildDisbursementSlipBodyHtml(slip);
    expectSignatoryTitles(html);
  });
});

describe("disbursement slip service invoice", () => {
  it("shows voucher check/reference no. as Service Invoice #", () => {
    const slip = voucherToSlip(
      sampleVoucher({ checkNumber: "SI-2026-0042" }),
      "https://example.test/logo.png"
    );
    expect(slip.serviceInvoiceNumber).toBe("SI-2026-0042");
    const html = buildDisbursementSlipBodyHtml(slip);
    expect(html).toContain("Service Invoice #:");
    expect(html).toContain("<strong>SI-2026-0042</strong>");
    expect(html).not.toContain("Date Forwarded for Voucher");
  });

  it("shows petty cash receipt/ref no. as Service Invoice #", () => {
    const slip = pettyCashToSlip(
      samplePettyCash({ receiptNumber: "OR-8891" }),
      "https://example.test/logo.png"
    );
    expect(slip.serviceInvoiceNumber).toBe("OR-8891");
    expect(buildDisbursementSlipBodyHtml(slip)).toContain(
      "<strong>OR-8891</strong>"
    );
  });

  it("omits the Service Invoice line when check/reference is empty", () => {
    const voucherSlip = voucherToSlip(
      sampleVoucher({ checkNumber: null }),
      "https://example.test/logo.png"
    );
    const pettySlip = pettyCashToSlip(
      samplePettyCash({ receiptNumber: "   " }),
      "https://example.test/logo.png"
    );
    expect(voucherSlip.serviceInvoiceNumber).toBe("");
    expect(pettySlip.serviceInvoiceNumber).toBe("");
    const html = buildDisbursementSlipBodyHtml(voucherSlip);
    expect(html).not.toContain("Service Invoice #");
  });

  it("prints the check/reference no. exactly as entered", () => {
    const slip = voucherToSlip(
      sampleVoucher({ checkNumber: "CHK-2026-0042" }),
      "https://example.test/logo.png"
    );
    expect(slip.serviceInvoiceNumber).toBe("CHK-2026-0042");
    expect(buildDisbursementSlipBodyHtml(slip)).toContain(
      "Service Invoice #: <strong>CHK-2026-0042</strong>"
    );
  });
});
