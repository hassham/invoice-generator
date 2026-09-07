using InvoiceApp.Application.Catalog;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Modules.Catalog;

namespace InvoiceApp.Infrastructure.Tests.Modules.Catalog;

public class CatalogItemRequestValidatorTests
{
    private static CatalogItemRequest ValidRequest(string name = "Consulting Hour") =>
        new(name, "One hour of consulting", "SKU-1", "hour", 150m, 10m);

    [Fact]
    public void Accepts_a_well_formed_request()
    {
        var exception = Record.Exception(() => CatalogItemRequestValidator.Validate(ValidRequest()));

        Assert.Null(exception);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Rejects_a_blank_name(string name)
    {
        var request = ValidRequest() with { Name = name };

        var exception = Assert.Throws<ValidationException>(() => CatalogItemRequestValidator.Validate(request));
        Assert.Contains("Name is required.", exception.Message);
    }

    [Fact]
    public void Rejects_a_negative_unit_price()
    {
        var request = ValidRequest() with { UnitPrice = -1 };

        var exception = Assert.Throws<ValidationException>(() => CatalogItemRequestValidator.Validate(request));
        Assert.Contains("Unit price cannot be negative.", exception.Message);
    }

    [Fact]
    public void Accepts_a_zero_unit_price()
    {
        var request = ValidRequest() with { UnitPrice = 0 };

        var exception = Record.Exception(() => CatalogItemRequestValidator.Validate(request));

        Assert.Null(exception);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(100.01)]
    public void Rejects_a_tax_rate_outside_zero_to_one_hundred(decimal taxRate)
    {
        var request = ValidRequest() with { TaxRate = taxRate };

        var exception = Assert.Throws<ValidationException>(() => CatalogItemRequestValidator.Validate(request));
        Assert.Contains("Tax rate must be between 0 and 100.", exception.Message);
    }

    [Fact]
    public void Accepts_a_missing_tax_rate()
    {
        var request = ValidRequest() with { TaxRate = null };

        var exception = Record.Exception(() => CatalogItemRequestValidator.Validate(request));

        Assert.Null(exception);
    }

    [Fact]
    public void Rejects_a_field_that_exceeds_its_database_column_length()
    {
        var request = ValidRequest() with { SKU = new string('a', 101) };

        var exception = Assert.Throws<ValidationException>(() => CatalogItemRequestValidator.Validate(request));
        Assert.Contains("SKU must be 100 characters or fewer.", exception.Message);
    }
}
