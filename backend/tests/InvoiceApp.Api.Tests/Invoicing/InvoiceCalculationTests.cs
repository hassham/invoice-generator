using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Api.Tests.Authentication;

namespace InvoiceApp.Api.Tests.Invoicing;

/// <summary>
/// Verifies the calculation endpoint at the real HTTP pipeline level: reachable without a
/// session (anonymous invoice creation is a first-class scenario), returns the same figures the
/// unit-tested InvoiceCalculator produces, and rejects invalid input with a client-safe message.
/// </summary>
public class InvoiceCalculationTests
{
    private const string CalculateEndpoint = "/api/v1/invoices/calculate";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
    };

    [Fact]
    public async Task Calculates_totals_without_requiring_a_session()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var request = new InvoiceCalculationRequest(
            [new InvoiceLineItemCalculationInput(2, 50, 10, 0)],
            DiscountType.None,
            null,
            TaxCalculationMethod.Exclusive);

        var response = await client.PostAsJsonAsync(CalculateEndpoint, request, JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<InvoiceCalculationResult>(JsonOptions);
        Assert.Equal(100m, result!.Subtotal);
        Assert.Equal(10m, result.TaxAmount);
        Assert.Equal(110m, result.TotalAmount);
    }

    [Fact]
    public async Task Serialises_discount_and_tax_method_enums_as_readable_strings_not_numbers()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var request = new InvoiceCalculationRequest(
            [new InvoiceLineItemCalculationInput(1, 100, 10, 0)],
            DiscountType.Percentage,
            10,
            TaxCalculationMethod.Inclusive);

        var response = await client.PostAsJsonAsync(CalculateEndpoint, request, JsonOptions);
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        // The request itself round-trips correctly only if enums serialise as their string name -
        // proven by the 200 above; this also spot-checks the raw JSON never contains a bare ordinal.
        Assert.DoesNotContain("\"discountType\":0", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Rejects_an_empty_item_list_with_a_client_safe_validation_message()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var request = new InvoiceCalculationRequest([], DiscountType.None, null, TaxCalculationMethod.Exclusive);

        var response = await client.PostAsJsonAsync(CalculateEndpoint, request, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("At least one item is required.", body);
    }

    [Fact]
    public async Task Rejects_a_negative_quantity()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var request = new InvoiceCalculationRequest(
            [new InvoiceLineItemCalculationInput(-1, 100, 10, 0)],
            DiscountType.None,
            null,
            TaxCalculationMethod.Exclusive);

        var response = await client.PostAsJsonAsync(CalculateEndpoint, request, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
