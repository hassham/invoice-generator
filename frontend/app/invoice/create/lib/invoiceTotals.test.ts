import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals, validateInvoiceDiscountValue } from "./invoiceTotals";

/**
 * Every case here has an identical counterpart in
 * backend/tests/InvoiceApp.Infrastructure.Tests/Modules/Invoicing/Calculations/InvoiceCalculatorTests.cs
 * with the same name (minus this file's suffix) and the same expected figures - this is IG-120's
 * "representative and boundary cases match across frontend preview and backend authority"
 * criterion, proven by keeping the two fixture sets in lockstep rather than by a live network call
 * (this page has no Save/Submit action yet to naturally trigger one - Epic IG-7 isn't built).
 * If you change one side's expected numbers, change the other to match.
 */
describe("calculateInvoiceTotals", () => {
  it("single line exclusive adds tax on top of the discounted amount", () => {
    const result = calculateInvoiceTotals([{ quantity: 2, unitPrice: 50, taxRate: 10, discount: 0 }], "None", null, "Exclusive");

    expect(result.subtotal).toBe(100);
    expect(result.taxAmount).toBe(10);
    expect(result.totalAmount).toBe(110);
    expect(result.amountDue).toBe(110);
  });

  it("single line inclusive backs tax out of the entered price matching FSD section 29's worked example", () => {
    const result = calculateInvoiceTotals([{ quantity: 1, unitPrice: 110, taxRate: 10, discount: 0 }], "None", null, "Inclusive");

    expect(result.subtotal).toBe(100);
    expect(result.taxAmount).toBe(10);
    expect(result.totalAmount).toBe(110);
    expect(result.items[0]).toEqual({ lineSubtotal: 100, taxAmount: 10, lineTotal: 110 });
  });

  it("line-level discount reduces the taxable amount before tax is applied", () => {
    const result = calculateInvoiceTotals([{ quantity: 1, unitPrice: 100, taxRate: 10, discount: 20 }], "None", null, "Exclusive");

    expect(result.subtotal).toBe(80);
    expect(result.taxAmount).toBe(8);
    expect(result.totalAmount).toBe(88);
  });

  it("multiple lines with different tax rates are summed independently", () => {
    const result = calculateInvoiceTotals(
      [
        { quantity: 1, unitPrice: 100, taxRate: 10, discount: 0 },
        { quantity: 1, unitPrice: 100, taxRate: 20, discount: 0 },
      ],
      "None",
      null,
      "Exclusive",
    );

    expect(result.subtotal).toBe(200);
    expect(result.taxAmount).toBe(30);
    expect(result.totalAmount).toBe(230);
  });

  it("fixed invoice discount is prorated across lines before their own tax is computed", () => {
    const result = calculateInvoiceTotals(
      [
        { quantity: 1, unitPrice: 100, taxRate: 10, discount: 0 },
        { quantity: 1, unitPrice: 100, taxRate: 20, discount: 0 },
      ],
      "Fixed",
      50,
      "Exclusive",
    );

    expect(result.discountAmount).toBe(50);
    expect(result.subtotal).toBe(150);
    expect(result.taxAmount).toBe(22.5);
    expect(result.totalAmount).toBe(172.5);
  });

  it("percentage invoice discount is applied to the subtotal", () => {
    const result = calculateInvoiceTotals(
      [
        { quantity: 1, unitPrice: 100, taxRate: 10, discount: 0 },
        { quantity: 1, unitPrice: 100, taxRate: 20, discount: 0 },
      ],
      "Percentage",
      10,
      "Exclusive",
    );

    expect(result.discountAmount).toBe(20);
    expect(result.subtotal).toBe(180);
    expect(result.taxAmount).toBe(27);
    expect(result.totalAmount).toBe(207);
  });

  it("a fixed invoice discount larger than the subtotal is clamped rather than going negative", () => {
    const result = calculateInvoiceTotals([{ quantity: 1, unitPrice: 100, taxRate: 0, discount: 0 }], "Fixed", 150, "Exclusive");

    expect(result.discountAmount).toBe(100);
    expect(result.subtotal).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  it("a percentage invoice discount over 100 is clamped rather than going negative", () => {
    // Caught by real-browser testing: an out-of-range percentage is flagged invalid by
    // validateInvoiceDiscountValue, but this function runs on every keystroke for the immediate
    // preview regardless of validity, so it must not produce a negative total while the user is
    // still typing (or hasn't corrected) an out-of-range value.
    const result = calculateInvoiceTotals([{ quantity: 1, unitPrice: 100, taxRate: 10, discount: 0 }], "Percentage", 150, "Exclusive");

    expect(result.discountAmount).toBe(100);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  it("rounds to two decimal places using round-half-up matching FSD section 28's example", () => {
    const result = calculateInvoiceTotals([{ quantity: 1, unitPrice: 10.555, taxRate: 0, discount: 0 }], "None", null, "Exclusive");

    expect(result.subtotal).toBe(10.56);
    expect(result.totalAmount).toBe(10.56);
  });

  it("all zero-value lines do not produce NaN from a division by zero", () => {
    const result = calculateInvoiceTotals([{ quantity: 1, unitPrice: 0, taxRate: 10, discount: 0 }], "Fixed", 0, "Exclusive");

    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(0);
    expect(Number.isNaN(result.totalAmount)).toBe(false);
  });

  it("amount due always equals the total since no payments can be recorded yet", () => {
    const result = calculateInvoiceTotals([{ quantity: 3, unitPrice: 33.33, taxRate: 10, discount: 0 }], "None", null, "Exclusive");

    expect(result.amountDue).toBe(result.totalAmount);
  });

  it("a zero tax rate line contributes no tax", () => {
    const result = calculateInvoiceTotals([{ quantity: 1, unitPrice: 100, taxRate: 0, discount: 0 }], "None", null, "Exclusive");

    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(100);
  });
});

describe("validateInvoiceDiscountValue", () => {
  it("requires no value when the discount type is None", () => {
    expect(validateInvoiceDiscountValue("None", "")).toBeUndefined();
  });

  it("requires a value when a discount type is selected", () => {
    expect(validateInvoiceDiscountValue("Fixed", "")).toBe("Enter a discount value.");
  });

  it("rejects a negative value", () => {
    expect(validateInvoiceDiscountValue("Fixed", "-10")).toBe("Discount value cannot be negative.");
  });

  it("rejects a percentage over 100", () => {
    expect(validateInvoiceDiscountValue("Percentage", "150")).toBe("Discount percentage must be between 0 and 100.");
  });

  it("accepts a fixed value larger than 100 since it is not a percentage", () => {
    expect(validateInvoiceDiscountValue("Fixed", "150")).toBeUndefined();
  });

  it("accepts a valid percentage", () => {
    expect(validateInvoiceDiscountValue("Percentage", "10")).toBeUndefined();
  });
});
