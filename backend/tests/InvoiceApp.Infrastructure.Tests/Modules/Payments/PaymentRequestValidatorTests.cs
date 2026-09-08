using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Payments;
using InvoiceApp.Domain.Payments;
using InvoiceApp.Modules.Payments;

namespace InvoiceApp.Infrastructure.Tests.Modules.Payments;

public class PaymentRequestValidatorTests
{
    private static PaymentRequest ValidRequest() =>
        new(new DateOnly(2030, 1, 1), 50m, PaymentMethod.Cash, "REF-1", "Paid in full");

    [Fact]
    public void Accepts_a_well_formed_request()
    {
        var exception = Record.Exception(() => PaymentRequestValidator.Validate(ValidRequest()));

        Assert.Null(exception);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Rejects_a_non_positive_amount(decimal amount)
    {
        var request = ValidRequest() with { Amount = amount };

        var exception = Assert.Throws<ValidationException>(() => PaymentRequestValidator.Validate(request));
        Assert.Contains("Amount must be greater than zero.", exception.Message);
    }

    [Fact]
    public void Rejects_a_reference_that_exceeds_its_database_column_length()
    {
        var request = ValidRequest() with { Reference = new string('a', 201) };

        var exception = Assert.Throws<ValidationException>(() => PaymentRequestValidator.Validate(request));
        Assert.Contains("Reference must be 200 characters or fewer.", exception.Message);
    }

    [Fact]
    public void Accepts_a_missing_reference()
    {
        var request = ValidRequest() with { Reference = null };

        var exception = Record.Exception(() => PaymentRequestValidator.Validate(request));

        Assert.Null(exception);
    }
}
