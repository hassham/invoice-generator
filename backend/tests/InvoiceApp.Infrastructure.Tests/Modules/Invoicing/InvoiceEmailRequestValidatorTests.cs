using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Modules.Invoicing;

namespace InvoiceApp.Infrastructure.Tests.Modules.Invoicing;

public class InvoiceEmailRequestValidatorTests
{
    private static InvoiceEmailRequest ValidRequest() => new(
        To: ["customer@example.com"],
        Cc: ["accounts@example.com"],
        Subject: "Invoice INV-0001 from Acme Pty Ltd",
        Message: "Please find your invoice attached.");

    [Fact]
    public void Accepts_a_well_formed_request()
    {
        var exception = Record.Exception(() => InvoiceEmailRequestValidator.Validate(ValidRequest()));

        Assert.Null(exception);
    }

    [Fact]
    public void Accepts_an_empty_cc_list()
    {
        var exception = Record.Exception(() => InvoiceEmailRequestValidator.Validate(ValidRequest() with { Cc = [] }));

        Assert.Null(exception);
    }

    [Fact]
    public void Rejects_no_recipients()
    {
        var exception = Assert.Throws<ValidationException>(() => InvoiceEmailRequestValidator.Validate(ValidRequest() with { To = [] }));

        Assert.Contains("recipient is required", exception.Message);
    }

    [Fact]
    public void Rejects_a_malformed_recipient_address()
    {
        var exception = Assert.Throws<ValidationException>(() => InvoiceEmailRequestValidator.Validate(ValidRequest() with { To = ["not-an-email"] }));

        Assert.Contains("not a valid email address", exception.Message);
    }

    [Fact]
    public void Rejects_a_malformed_cc_address()
    {
        var exception = Assert.Throws<ValidationException>(() => InvoiceEmailRequestValidator.Validate(ValidRequest() with { Cc = ["also not an email"] }));

        Assert.Contains("not a valid email address", exception.Message);
    }

    [Fact]
    public void Rejects_more_than_ten_recipients()
    {
        var tooMany = Enumerable.Range(1, 11).Select(i => $"person{i}@example.com").ToList();

        var exception = Assert.Throws<ValidationException>(() => InvoiceEmailRequestValidator.Validate(ValidRequest() with { To = tooMany }));

        Assert.Contains("No more than 10 recipients", exception.Message);
    }

    [Fact]
    public void Rejects_a_missing_subject()
    {
        var exception = Assert.Throws<ValidationException>(() => InvoiceEmailRequestValidator.Validate(ValidRequest() with { Subject = "  " }));

        Assert.Contains("Subject is required", exception.Message);
    }

    [Fact]
    public void Rejects_a_missing_message()
    {
        var exception = Assert.Throws<ValidationException>(() => InvoiceEmailRequestValidator.Validate(ValidRequest() with { Message = "" }));

        Assert.Contains("Message is required", exception.Message);
    }

    [Fact]
    public void Rejects_an_oversized_subject()
    {
        var exception = Assert.Throws<ValidationException>(() => InvoiceEmailRequestValidator.Validate(ValidRequest() with { Subject = new string('a', 201) }));

        Assert.Contains("200 characters or fewer", exception.Message);
    }

    [Fact]
    public void Rejects_an_oversized_message()
    {
        var exception = Assert.Throws<ValidationException>(() => InvoiceEmailRequestValidator.Validate(ValidRequest() with { Message = new string('a', 5001) }));

        Assert.Contains("5000 characters or fewer", exception.Message);
    }
}
