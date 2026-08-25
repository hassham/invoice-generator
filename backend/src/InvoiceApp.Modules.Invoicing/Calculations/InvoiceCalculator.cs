using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Modules.Invoicing.Calculations;

/// <summary>
/// The authoritative invoice calculation engine (FSD section 26's 8-step sequence, section 27's
/// per-line formula, section 29's tax-inclusive/exclusive handling). "Additional charges" (step 5)
/// is omitted - FSD mentions it only as "if applicable" and defines no fields for it anywhere,
/// so there is nothing to calculate yet; and "amount paid" (step 7) is always 0 here since this is
/// a stateless calculation with no persisted invoice/payment to read a real figure from (Epics
/// IG-7/IG-11 aren't built) - AmountDue therefore always equals TotalAmount for now.
///
/// All internal arithmetic stays at full decimal precision; rounding to 2 decimal places (FSD
/// section 28) is applied only once, to the figures actually returned, so intermediate steps don't
/// compound rounding error.
/// </summary>
public static class InvoiceCalculator
{
    public static InvoiceCalculationResult Calculate(InvoiceCalculationRequest request)
    {
        var lineAmounts = request.Items
            .Select(item => Math.Max((item.Quantity * item.UnitPrice) - item.Discount, 0m))
            .ToArray();

        var subtotal = lineAmounts.Sum();
        var invoiceDiscountAmount = CalculateInvoiceDiscount(request.InvoiceDiscountType, request.InvoiceDiscountValue, subtotal);
        var adjustedSubtotal = subtotal - invoiceDiscountAmount;

        var lineResults = new List<InvoiceLineItemCalculationResult>(request.Items.Count);
        decimal taxAmountTotal = 0;

        for (var i = 0; i < request.Items.Count; i++)
        {
            var item = request.Items[i];
            var share = subtotal > 0 ? lineAmounts[i] / subtotal : 0m;
            var lineAdjustedAmount = lineAmounts[i] - (invoiceDiscountAmount * share);

            var (lineSubtotal, lineTax) = request.TaxCalculationMethod == TaxCalculationMethod.Inclusive
                ? SplitInclusiveAmount(lineAdjustedAmount, item.TaxRate)
                : (lineAdjustedAmount, lineAdjustedAmount * (item.TaxRate / 100m));

            taxAmountTotal += lineTax;
            lineResults.Add(new InvoiceLineItemCalculationResult(
                Round(lineSubtotal),
                Round(lineTax),
                Round(lineSubtotal + lineTax)));
        }

        // Tax-exclusive: the grand total adds tax on top of the discounted subtotal.
        // Tax-inclusive: entered prices already include tax, so the discounted subtotal IS the
        // total - "Subtotal" reported below is the tax backed back out of it (FSD section 29's
        // worked example: $110 inclusive at 10% -> $100 ex-tax subtotal, $10 tax, $110 total).
        var totalAmount = request.TaxCalculationMethod == TaxCalculationMethod.Inclusive
            ? adjustedSubtotal
            : adjustedSubtotal + taxAmountTotal;
        var reportedSubtotal = request.TaxCalculationMethod == TaxCalculationMethod.Inclusive
            ? adjustedSubtotal - taxAmountTotal
            : adjustedSubtotal;

        return new InvoiceCalculationResult(
            lineResults,
            Round(reportedSubtotal),
            Round(invoiceDiscountAmount),
            Round(taxAmountTotal),
            Round(totalAmount),
            Round(totalAmount));
    }

    private static decimal CalculateInvoiceDiscount(DiscountType type, decimal? value, decimal subtotal)
    {
        var amount = value ?? 0m;
        return type switch
        {
            // Clamped to the subtotal/0-100 so a discount can never push the total negative. The
            // API endpoint already rejects an out-of-range value via
            // InvoiceCalculationRequestValidator before this ever runs, but the clamp stays here
            // too as defence in depth for any future direct caller of Calculate that skips that
            // validation step, and to mirror the frontend's identical clamp (lib/invoiceTotals.ts)
            // exactly, which has no such gate - it calculates on every keystroke for the preview.
            DiscountType.Fixed => Math.Min(Math.Max(amount, 0m), subtotal),
            DiscountType.Percentage => subtotal * (Math.Min(Math.Max(amount, 0m), 100m) / 100m),
            _ => 0m,
        };
    }

    private static (decimal ExclusiveAmount, decimal TaxAmount) SplitInclusiveAmount(decimal inclusiveAmount, decimal taxRate)
    {
        if (taxRate <= 0)
        {
            return (inclusiveAmount, 0m);
        }

        var exclusiveAmount = inclusiveAmount / (1 + (taxRate / 100m));
        return (exclusiveAmount, inclusiveAmount - exclusiveAmount);
    }

    private static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
