using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Infrastructure.Tests.Modules.Invoicing.Calculations;

public class InvoiceCalculationRequestValidatorTests
{
    private static InvoiceCalculationRequest ValidRequest() =>
        new([new InvoiceLineItemCalculationInput(1, 100, 10, 0)], DiscountType.None, null, TaxCalculationMethod.Exclusive);

    [Fact]
    public void Accepts_a_valid_request()
    {
        var exception = Record.Exception(() => InvoiceCalculationRequestValidator.Validate(ValidRequest()));

        Assert.Null(exception);
    }

    [Fact]
    public void Rejects_an_empty_item_list()
    {
        var request = ValidRequest() with { Items = [] };

        Assert.Throws<ValidationException>(() => InvoiceCalculationRequestValidator.Validate(request));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Rejects_a_non_positive_quantity(decimal quantity)
    {
        var request = ValidRequest() with { Items = [new InvoiceLineItemCalculationInput(quantity, 100, 10, 0)] };

        Assert.Throws<ValidationException>(() => InvoiceCalculationRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_a_negative_unit_price()
    {
        var request = ValidRequest() with { Items = [new InvoiceLineItemCalculationInput(1, -1, 10, 0)] };

        Assert.Throws<ValidationException>(() => InvoiceCalculationRequestValidator.Validate(request));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Rejects_a_tax_rate_outside_0_to_100(decimal taxRate)
    {
        var request = ValidRequest() with { Items = [new InvoiceLineItemCalculationInput(1, 100, taxRate, 0)] };

        Assert.Throws<ValidationException>(() => InvoiceCalculationRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_a_negative_discount()
    {
        var request = ValidRequest() with { Items = [new InvoiceLineItemCalculationInput(1, 100, 10, -1)] };

        Assert.Throws<ValidationException>(() => InvoiceCalculationRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_a_discount_larger_than_the_line_amount()
    {
        var request = ValidRequest() with { Items = [new InvoiceLineItemCalculationInput(1, 100, 10, 200)] };

        Assert.Throws<ValidationException>(() => InvoiceCalculationRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_a_missing_invoice_discount_value_when_a_discount_type_is_selected()
    {
        var request = ValidRequest() with { InvoiceDiscountType = DiscountType.Fixed, InvoiceDiscountValue = null };

        Assert.Throws<ValidationException>(() => InvoiceCalculationRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_a_negative_invoice_discount_value()
    {
        var request = ValidRequest() with { InvoiceDiscountType = DiscountType.Fixed, InvoiceDiscountValue = -10 };

        Assert.Throws<ValidationException>(() => InvoiceCalculationRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_an_invoice_discount_percentage_over_100()
    {
        var request = ValidRequest() with { InvoiceDiscountType = DiscountType.Percentage, InvoiceDiscountValue = 150 };

        Assert.Throws<ValidationException>(() => InvoiceCalculationRequestValidator.Validate(request));
    }

    [Fact]
    public void Accepts_a_fixed_invoice_discount_larger_than_100_since_it_is_not_a_percentage()
    {
        var request = ValidRequest() with { InvoiceDiscountType = DiscountType.Fixed, InvoiceDiscountValue = 150 };

        var exception = Record.Exception(() => InvoiceCalculationRequestValidator.Validate(request));

        Assert.Null(exception);
    }
}
