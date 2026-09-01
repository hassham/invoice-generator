using InvoiceApp.Application.Customers;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Modules.Customers;

namespace InvoiceApp.Infrastructure.Tests.Modules.Customers;

public class CustomerRequestValidatorTests
{
    private static CustomerRequest ValidRequest(string? businessName = "Acme Pty Ltd", string? contactName = null) =>
        new(businessName, contactName, "billing@acme.example", "0400000000", "1 Main St", null, "Sydney", "NSW", "2000", "AU", "12345", "Preferred customer");

    [Fact]
    public void Accepts_a_well_formed_request()
    {
        var exception = Record.Exception(() => CustomerRequestValidator.Validate(ValidRequest()));

        Assert.Null(exception);
    }

    [Fact]
    public void Accepts_a_request_identified_only_by_contact_name()
    {
        var request = ValidRequest(businessName: null, contactName: "Jamie Lee");

        var exception = Record.Exception(() => CustomerRequestValidator.Validate(request));

        Assert.Null(exception);
    }

    [Fact]
    public void Rejects_a_request_with_neither_business_nor_contact_name()
    {
        var request = ValidRequest(businessName: null, contactName: "   ");

        var exception = Assert.Throws<ValidationException>(() => CustomerRequestValidator.Validate(request));
        Assert.Contains("Customer name is required.", exception.Message);
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("missing-domain@")]
    public void Rejects_a_malformed_email(string email)
    {
        var request = ValidRequest() with { Email = email };

        Assert.Throws<ValidationException>(() => CustomerRequestValidator.Validate(request));
    }

    [Fact]
    public void Accepts_a_missing_email()
    {
        var request = ValidRequest() with { Email = null };

        var exception = Record.Exception(() => CustomerRequestValidator.Validate(request));

        Assert.Null(exception);
    }

    [Fact]
    public void Rejects_a_field_that_exceeds_its_database_column_length()
    {
        var request = ValidRequest() with { Country = "AUS" };

        var exception = Assert.Throws<ValidationException>(() => CustomerRequestValidator.Validate(request));
        Assert.Contains("Country must be 2 characters or fewer.", exception.Message);
    }
}
