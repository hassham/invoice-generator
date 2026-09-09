using System.Net;
using System.Net.Http.Json;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Documents;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Api.Tests.RateLimiting;

/// <summary>
/// Verifies IG-71's own AC (FSD section 87: "Sensitive and expensive endpoints use configurable
/// rate limits") at the real HTTP pipeline level: /api/v1/invoices/pdf is anonymous and
/// computationally expensive (QuestPDF rendering) with no session to naturally throttle abuse -
/// it now shares the same "auth" rate-limit policy password reset already joined. Overrides the
/// real default down to a small, deterministic threshold, same pattern as AuthRateLimitingTests.
/// </summary>
public class PdfRateLimitingTests
{
    private const string PdfEndpoint = "/api/v1/invoices/pdf";
    private const int PermitLimit = 3;

    private static InvoicePdfRequest ValidRequest() => new(
        InvoiceNumber: "INV-RATE-LIMIT",
        IssueDate: new DateOnly(2030, 1, 1),
        DueDate: new DateOnly(2030, 1, 15),
        Reference: null,
        Currency: "AUD",
        Seller: "Acme Pty Ltd",
        Customer: "Test Customer",
        ShipTo: null,
        Items: [new InvoicePdfLineItem("Consulting", 1, null, 100, 0, 0)],
        InvoiceDiscountType: DiscountType.None,
        InvoiceDiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: null,
        Terms: null,
        CustomInstructions: null,
        PaymentInstructions: null,
        TemplateCode: "classic",
        TemplateCustomization: new InvoiceTemplateCustomization("#0f172a", "#0f172a", "Arial, Helvetica, sans-serif", "Banner"),
        Logo: null);

    [Fact]
    public async Task Requests_within_the_configured_limit_all_succeed()
    {
        using var factory = new AuthenticatedRouteTestFactory(rateLimitPermitLimitOverride: PermitLimit);
        using var client = factory.CreateClient();

        for (var i = 0; i < PermitLimit; i++)
        {
            var response = await client.PostAsJsonAsync(PdfEndpoint, ValidRequest());
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    [Fact]
    public async Task Requests_beyond_the_configured_limit_are_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory(rateLimitPermitLimitOverride: PermitLimit);
        using var client = factory.CreateClient();

        for (var i = 0; i < PermitLimit; i++)
        {
            (await client.PostAsJsonAsync(PdfEndpoint, ValidRequest())).EnsureSuccessStatusCode();
        }

        var rejected = await client.PostAsJsonAsync(PdfEndpoint, ValidRequest());

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
    }
}
