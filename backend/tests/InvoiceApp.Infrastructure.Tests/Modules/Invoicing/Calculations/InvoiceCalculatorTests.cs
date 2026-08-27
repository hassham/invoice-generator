using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Infrastructure.Tests.Modules.Invoicing.Calculations;

public class InvoiceCalculatorTests
{
    private static InvoiceCalculationRequest Request(
        IReadOnlyList<InvoiceLineItemCalculationInput> items,
        DiscountType discountType = DiscountType.None,
        decimal? discountValue = null,
        TaxCalculationMethod method = TaxCalculationMethod.Exclusive) =>
        new(items, discountType, discountValue, method);

    [Fact]
    public void Single_line_exclusive_adds_tax_on_top_of_the_discounted_amount()
    {
        var request = Request([new InvoiceLineItemCalculationInput(2, 50, 10, 0)]);

        var result = InvoiceCalculator.Calculate(request);

        Assert.Equal(100m, result.Subtotal);
        Assert.Equal(10m, result.TaxAmount);
        Assert.Equal(110m, result.TotalAmount);
        Assert.Equal(110m, result.AmountDue);
    }

    [Fact]
    public void Single_line_inclusive_backs_tax_out_of_the_entered_price_matching_FSD_section_29s_worked_example()
    {
        // FSD section 29: $110 inclusive at 10% -> $100 subtotal ex tax, $10 tax, $110 total.
        var request = Request(
            [new InvoiceLineItemCalculationInput(1, 110, 10, 0)],
            method: TaxCalculationMethod.Inclusive);

        var result = InvoiceCalculator.Calculate(request);

        Assert.Equal(100m, result.Subtotal);
        Assert.Equal(10m, result.TaxAmount);
        Assert.Equal(110m, result.TotalAmount);

        var line = Assert.Single(result.Items);
        Assert.Equal(100m, line.LineSubtotal);
        Assert.Equal(10m, line.TaxAmount);
        Assert.Equal(110m, line.LineTotal);
    }

    [Fact]
    public void Line_level_discount_reduces_the_taxable_amount_before_tax_is_applied()
    {
        var request = Request([new InvoiceLineItemCalculationInput(1, 100, 10, 20)]);

        var result = InvoiceCalculator.Calculate(request);

        Assert.Equal(80m, result.Subtotal);
        Assert.Equal(8m, result.TaxAmount);
        Assert.Equal(88m, result.TotalAmount);
    }

    [Fact]
    public void Multiple_lines_with_different_tax_rates_are_summed_independently()
    {
        var request = Request([
            new InvoiceLineItemCalculationInput(1, 100, 10, 0),
            new InvoiceLineItemCalculationInput(1, 100, 20, 0),
        ]);

        var result = InvoiceCalculator.Calculate(request);

        Assert.Equal(200m, result.Subtotal);
        Assert.Equal(30m, result.TaxAmount); // 10 + 20
        Assert.Equal(230m, result.TotalAmount);
    }

    [Fact]
    public void Fixed_invoice_discount_is_prorated_across_lines_before_their_own_tax_is_computed()
    {
        var request = Request(
            [
                new InvoiceLineItemCalculationInput(1, 100, 10, 0),
                new InvoiceLineItemCalculationInput(1, 100, 20, 0),
            ],
            discountType: DiscountType.Fixed,
            discountValue: 50);

        var result = InvoiceCalculator.Calculate(request);

        // Each line has an equal 50% share of the $200 subtotal, so each absorbs $25 of the $50
        // invoice discount: line A taxable = 75 -> tax 7.50; line B taxable = 75 -> tax 15.00.
        Assert.Equal(50m, result.DiscountAmount);
        Assert.Equal(150m, result.Subtotal);
        Assert.Equal(22.5m, result.TaxAmount);
        Assert.Equal(172.5m, result.TotalAmount);
    }

    [Fact]
    public void Percentage_invoice_discount_is_applied_to_the_subtotal()
    {
        var request = Request(
            [
                new InvoiceLineItemCalculationInput(1, 100, 10, 0),
                new InvoiceLineItemCalculationInput(1, 100, 20, 0),
            ],
            discountType: DiscountType.Percentage,
            discountValue: 10);

        var result = InvoiceCalculator.Calculate(request);

        Assert.Equal(20m, result.DiscountAmount);
        Assert.Equal(180m, result.Subtotal);
        Assert.Equal(27m, result.TaxAmount);
        Assert.Equal(207m, result.TotalAmount);
    }

    [Fact]
    public void A_fixed_invoice_discount_larger_than_the_subtotal_is_clamped_rather_than_going_negative()
    {
        var request = Request(
            [new InvoiceLineItemCalculationInput(1, 100, 0, 0)],
            discountType: DiscountType.Fixed,
            discountValue: 150);

        var result = InvoiceCalculator.Calculate(request);

        Assert.Equal(100m, result.DiscountAmount);
        Assert.Equal(0m, result.Subtotal);
        Assert.Equal(0m, result.TotalAmount);
    }

    [Fact]
    public void A_percentage_invoice_discount_over_100_is_clamped_rather_than_going_negative()
    {
        // The API endpoint's validator already rejects this before it reaches here - this proves
        // Calculate itself is still defensive, e.g. for any future caller that skips validation.
        var request = Request(
            [new InvoiceLineItemCalculationInput(1, 100, 10, 0)],
            discountType: DiscountType.Percentage,
            discountValue: 150);

        var result = InvoiceCalculator.Calculate(request);

        Assert.Equal(100m, result.DiscountAmount);
        Assert.Equal(0m, result.Subtotal);
        Assert.Equal(0m, result.TaxAmount);
        Assert.Equal(0m, result.TotalAmount);
    }

    [Fact]
    public void Rounds_to_two_decimal_places_using_round_half_up_matching_FSD_section_28s_example()
    {
        // FSD section 28: 10.555 may display 10.56.
        var request = Request([new InvoiceLineItemCalculationInput(1, 10.555m, 0, 0)]);

        var result = InvoiceCalculator.Calculate(request);

        Assert.Equal(10.56m, result.Subtotal);
        Assert.Equal(10.56m, result.TotalAmount);
    }

    [Fact]
    public void All_zero_value_lines_do_not_produce_a_division_by_zero()
    {
        var request = Request(
            [new InvoiceLineItemCalculationInput(1, 0, 10, 0)],
            discountType: DiscountType.Fixed,
            discountValue: 0);

        var result = InvoiceCalculator.Calculate(request);

        Assert.Equal(0m, result.Subtotal);
        Assert.Equal(0m, result.TaxAmount);
        Assert.Equal(0m, result.TotalAmount);
    }

    [Fact]
    public void Amount_due_always_equals_the_total_since_no_payments_can_be_recorded_yet()
    {
        var request = Request([new InvoiceLineItemCalculationInput(3, 33.33m, 10, 0)]);

        var result = InvoiceCalculator.Calculate(request);

        Assert.Equal(result.TotalAmount, result.AmountDue);
    }

    [Fact]
    public void A_zero_tax_rate_line_contributes_no_tax()
    {
        var request = Request([new InvoiceLineItemCalculationInput(1, 100, 0, 0)]);

        var result = InvoiceCalculator.Calculate(request);

        Assert.Equal(0m, result.TaxAmount);
        Assert.Equal(100m, result.TotalAmount);
    }
}
