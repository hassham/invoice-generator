import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "./invoiceDraft";
import { createEmptyLineItem } from "./lineItems";
import { createEmptySupportingContent } from "./supportingContent";
import { getInvalidSectionLabels, hasAdvancedOnlyError, isInvoiceValid, validateInvoice } from "./invoiceValidation";

function blankInput() {
  const draft = createEmptyDraft();
  return {
    header: { ...draft.header, issueDate: "2026-08-19", dueDate: "2026-09-02" },
    seller: draft.seller,
    customer: draft.customer,
    shipTo: draft.shipTo,
    lineItems: [createEmptyLineItem()],
    invoiceDiscountType: "None" as const,
    invoiceDiscountValue: "",
    supportingContent: createEmptySupportingContent(),
  };
}

function validInput() {
  return {
    ...blankInput(),
    header: { invoiceNumber: "INV-000001", issueDate: "2026-08-19", dueDate: "2026-09-02", reference: "" },
    seller: "Acme Pty Ltd\n123 Example St",
    customer: "Jane's Cafe\n45 Coffee Rd",
    lineItems: [{ ...createEmptyLineItem(), description: "Consulting", quantity: "2", unitPrice: "50" }],
  };
}

describe("validateInvoice / isInvoiceValid", () => {
  it("a blank invoice is invalid - missing invoice number, From, Bill To and a valid item", () => {
    const result = validateInvoice(blankInput());
    expect(isInvoiceValid(result)).toBe(false);
    expect(result.headerErrors.invoiceNumber).toBe("Invoice Number is required.");
    expect(result.sellerError).toBe("From is required.");
    expect(result.customerError).toBe("Bill To is required.");
  });

  it("a fully filled-in invoice is valid", () => {
    const result = validateInvoice(validInput());
    expect(isInvoiceValid(result)).toBe(true);
  });

  it("an out-of-range invoice discount makes an otherwise-valid invoice invalid", () => {
    const result = validateInvoice({ ...validInput(), invoiceDiscountType: "Percentage", invoiceDiscountValue: "150" });
    expect(isInvoiceValid(result)).toBe(false);
    expect(result.invoiceDiscountError).toBeTruthy();
  });
});

describe("getInvalidSectionLabels", () => {
  it("names every section that currently has an error", () => {
    const result = validateInvoice(blankInput());
    const labels = getInvalidSectionLabels(result);
    expect(labels).toContain("Invoice details");
    expect(labels).toContain("From");
    expect(labels).toContain("Bill To");
    expect(labels).toContain("Items");
  });

  it("is empty for a fully valid invoice", () => {
    expect(getInvalidSectionLabels(validateInvoice(validInput()))).toEqual([]);
  });

  it("names Ship To only when it has its own error (over the 1000 character limit)", () => {
    const result = validateInvoice({ ...validInput(), shipTo: "a".repeat(1001) });
    expect(getInvalidSectionLabels(result)).toContain("Ship To");
  });
});

describe("hasAdvancedOnlyError", () => {
  it("is false when only Basic-tier fields are invalid", () => {
    expect(hasAdvancedOnlyError(validateInvoice(blankInput()))).toBe(false);
  });

  it("is true when Due Date is invalid (earlier than Issue Date)", () => {
    const input = validInput();
    const result = validateInvoice({ ...input, header: { ...input.header, dueDate: "2000-01-01" } });
    expect(hasAdvancedOnlyError(result)).toBe(true);
  });

  it("is true when Ship To is invalid", () => {
    const result = validateInvoice({ ...validInput(), shipTo: "a".repeat(1001) });
    expect(hasAdvancedOnlyError(result)).toBe(true);
  });

  it("is true when a Payment Instruction field is invalid (over its character limit)", () => {
    const input = validInput();
    const result = validateInvoice({
      ...input,
      supportingContent: {
        ...input.supportingContent,
        paymentInstructions: { ...input.supportingContent.paymentInstructions, bankName: "a".repeat(201) },
      },
    });
    expect(hasAdvancedOnlyError(result)).toBe(true);
  });
});
