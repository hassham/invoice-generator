import type { LineItemCalculationInput } from "./lineItems";

export type InvoiceDiscountType = "None" | "Percentage" | "Fixed";
export type TaxCalculationMethod = "Exclusive" | "Inclusive";

export interface InvoiceTotalsLineResult {
  lineSubtotal: number;
  taxAmount: number;
  lineTotal: number;
}

export interface InvoiceTotalsResult {
  items: InvoiceTotalsLineResult[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountDue: number;
}

function round(value: number): number {
  // Matches the backend's Math.Round(value, 2, MidpointRounding.AwayFromZero) - round half up.
  // C#'s decimal type is base-10 exact, so 10.555 * 1 is exactly representable there; JS's binary
  // floating point stores 10.555 as ~10.554999999999999716, so a plain `Math.round(value * 100)`
  // would round FSD section 28's own worked example (10.555 -> 10.56) down to 10.55. Nudging by an
  // epsilon far larger than that representation error (~1e-13) but far smaller than half a cent
  // corrects for it without affecting genuinely-not-on-the-boundary values.
  const epsilon = value >= 0 ? 1e-10 : -1e-10;
  return Math.round(value * 100 + epsilon) / 100;
}

function calculateInvoiceDiscount(type: InvoiceDiscountType, value: number | null, subtotal: number): number {
  const amount = value ?? 0;
  switch (type) {
    case "Fixed":
      // Clamped to the subtotal so a discount can never push the total negative.
      return Math.min(Math.max(amount, 0), subtotal);
    case "Percentage":
      // Clamped to 0-100 for the same reason - an out-of-range percentage is already flagged
      // invalid by validateInvoiceDiscountValue, but this function runs unconditionally on every
      // keystroke for the immediate preview (unlike the backend, which validates before it ever
      // calculates), so it must degrade gracefully rather than produce a negative total mid-typing.
      return subtotal * (Math.min(Math.max(amount, 0), 100) / 100);
    default:
      return 0;
  }
}

function splitInclusiveAmount(inclusiveAmount: number, taxRate: number): { exclusiveAmount: number; taxAmount: number } {
  if (taxRate <= 0) {
    return { exclusiveAmount: inclusiveAmount, taxAmount: 0 };
  }
  const exclusiveAmount = inclusiveAmount / (1 + taxRate / 100);
  return { exclusiveAmount, taxAmount: inclusiveAmount - exclusiveAmount };
}

/**
 * Frontend mirror of `backend/src/InvoiceApp.Modules.Invoicing/Calculations/InvoiceCalculator.cs`
 * - FSD section 28 explicitly allows a frontend calculation for immediate preview, with the
 * backend result treated as authoritative (IG-119). This function must stay algorithmically
 * identical to the C# version (same rounding point, same pro-rata invoice-discount distribution)
 * - IG-120's shared test fixtures (`invoiceTotals.test.ts` / `InvoiceCalculatorTests.cs`) exist
 * specifically to catch the two drifting apart.
 */
export function calculateInvoiceTotals(
  items: LineItemCalculationInput[],
  invoiceDiscountType: InvoiceDiscountType,
  invoiceDiscountValue: number | null,
  taxCalculationMethod: TaxCalculationMethod,
): InvoiceTotalsResult {
  const lineAmounts = items.map((item) => Math.max(item.quantity * item.unitPrice - item.discount, 0));
  const subtotal = lineAmounts.reduce((sum, amount) => sum + amount, 0);

  const discountAmount = calculateInvoiceDiscount(invoiceDiscountType, invoiceDiscountValue, subtotal);
  const adjustedSubtotal = subtotal - discountAmount;

  const lineResults: InvoiceTotalsLineResult[] = [];
  let taxAmountTotal = 0;

  items.forEach((item, index) => {
    const share = subtotal > 0 ? lineAmounts[index] / subtotal : 0;
    const lineAdjustedAmount = lineAmounts[index] - discountAmount * share;

    const { lineSubtotal, lineTax } =
      taxCalculationMethod === "Inclusive"
        ? (() => {
            const split = splitInclusiveAmount(lineAdjustedAmount, item.taxRate);
            return { lineSubtotal: split.exclusiveAmount, lineTax: split.taxAmount };
          })()
        : { lineSubtotal: lineAdjustedAmount, lineTax: lineAdjustedAmount * (item.taxRate / 100) };

    taxAmountTotal += lineTax;
    lineResults.push({
      lineSubtotal: round(lineSubtotal),
      taxAmount: round(lineTax),
      lineTotal: round(lineSubtotal + lineTax),
    });
  });

  const totalAmount = taxCalculationMethod === "Inclusive" ? adjustedSubtotal : adjustedSubtotal + taxAmountTotal;
  const reportedSubtotal = taxCalculationMethod === "Inclusive" ? adjustedSubtotal - taxAmountTotal : adjustedSubtotal;

  return {
    items: lineResults,
    subtotal: round(reportedSubtotal),
    discountAmount: round(discountAmount),
    taxAmount: round(taxAmountTotal),
    totalAmount: round(totalAmount),
    amountDue: round(totalAmount),
  };
}

/** Mirrors InvoiceCalculationRequestValidator's invoice-discount rule on the backend. */
export function validateInvoiceDiscountValue(type: InvoiceDiscountType, value: string): string | undefined {
  if (type === "None") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "Enter a discount value.";
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "Discount value cannot be negative.";
  }

  if (type === "Percentage" && parsed > 100) {
    return "Discount percentage must be between 0 and 100.";
  }

  return undefined;
}
