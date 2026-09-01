using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Modules.Invoicing;

namespace InvoiceApp.Infrastructure.Tests.Modules.Invoicing;

public class InvoiceSaveRequestValidatorTests
{
    private static InvoiceSaveRequest ValidRequest() => new(
        InvoiceNumber: "INV-0001",
        IssueDate: new DateOnly(2026, 8, 1),
        DueDate: new DateOnly(2026, 8, 15),
        Reference: null,
        Currency: "AUD",
        Seller: "Acme Pty Ltd",
        Customer: "Beta Customer",
        ShipTo: null,
        Items: [new InvoiceSaveLineItem("Consulting", 1, null, 100, 10, 0)],
        InvoiceDiscountType: DiscountType.None,
        InvoiceDiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: null,
        Terms: null,
        CustomInstructions: null,
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    [Fact]
    public void Accepts_a_well_formed_request()
    {
        var exception = Record.Exception(() => InvoiceSaveRequestValidator.Validate(ValidRequest()));

        Assert.Null(exception);
    }

    [Fact]
    public void Rejects_a_missing_invoice_number()
    {
        var request = ValidRequest() with { InvoiceNumber = "" };

        var exception = Assert.Throws<ValidationException>(() => InvoiceSaveRequestValidator.Validate(request));
        Assert.Contains("Invoice number is required.", exception.Message);
    }

    [Fact]
    public void Rejects_a_due_date_before_the_issue_date()
    {
        var request = ValidRequest() with { DueDate = new DateOnly(2026, 7, 1) };

        var exception = Assert.Throws<ValidationException>(() => InvoiceSaveRequestValidator.Validate(request));
        Assert.Contains("Due date cannot be earlier than the issue date.", exception.Message);
    }

    [Fact]
    public void Rejects_a_missing_seller()
    {
        var request = ValidRequest() with { Seller = "   " };

        var exception = Assert.Throws<ValidationException>(() => InvoiceSaveRequestValidator.Validate(request));
        Assert.Contains("From is required.", exception.Message);
    }

    [Fact]
    public void Rejects_a_missing_customer()
    {
        var request = ValidRequest() with { Customer = "" };

        var exception = Assert.Throws<ValidationException>(() => InvoiceSaveRequestValidator.Validate(request));
        Assert.Contains("Bill To is required.", exception.Message);
    }

    [Fact]
    public void Rejects_a_currency_that_is_not_a_3_letter_code()
    {
        var request = ValidRequest() with { Currency = "AUDX" };

        Assert.Throws<ValidationException>(() => InvoiceSaveRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_an_item_with_no_description()
    {
        var request = ValidRequest() with { Items = [new InvoiceSaveLineItem("", 1, null, 100, 10, 0)] };

        var exception = Assert.Throws<ValidationException>(() => InvoiceSaveRequestValidator.Validate(request));
        Assert.Contains("Item 1: description is required.", exception.Message);
    }

    [Fact]
    public void Delegates_numeric_item_checks_to_the_shared_calculation_validator()
    {
        var request = ValidRequest() with { Items = [new InvoiceSaveLineItem("Consulting", -1, null, 100, 10, 0)] };

        var exception = Assert.Throws<ValidationException>(() => InvoiceSaveRequestValidator.Validate(request));
        Assert.Contains("quantity must be greater than 0", exception.Message);
    }
}
