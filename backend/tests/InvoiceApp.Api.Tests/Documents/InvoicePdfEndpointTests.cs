using System.Net;
using System.Net.Http.Json;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Documents;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Api.Tests.Documents;

/// <summary>
/// Verifies POST /api/v1/invoices/pdf at the real HTTP pipeline level: reachable without a session
/// (stateless, same reasoning as /api/v1/invoices/calculate), renders a real PDF for a valid
/// request, and rejects an invalid one with a client-safe message rather than a stack trace.
/// </summary>
public class InvoicePdfEndpointTests
{
    private const string PdfEndpoint = "/api/v1/invoices/pdf";

    private static InvoicePdfRequest ValidRequest() => new(
        InvoiceNumber: "INV-000123",
        IssueDate: new DateOnly(2026, 8, 19),
        DueDate: new DateOnly(2026, 9, 2),
        Reference: null,
        Currency: "AUD",
        Seller: "Acme Pty Ltd\n123 Example St",
        Customer: "Jane's Cafe\n45 Coffee Rd",
        ShipTo: null,
        Items: [new InvoicePdfLineItem("Consulting", 2, null, 50, 10, 0)],
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
    public async Task Returns_a_pdf_for_a_valid_request_without_requiring_a_session()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(PdfEndpoint, ValidRequest());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("Invoice-INV-000123.pdf", response.Content.Headers.ContentDisposition?.FileName);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0);
        // PDF file signature ("%PDF") - confirms QuestPDF actually produced a PDF, not just bytes.
        Assert.Equal("%PDF"u8.ToArray(), bytes[..4]);
    }

    [Fact]
    public async Task Rejects_a_request_with_no_line_items_with_a_client_safe_message()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        var request = ValidRequest() with { Items = [] };

        var response = await client.PostAsJsonAsync(PdfEndpoint, request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("At least one item is required.", body);
    }

    [Fact]
    public async Task Rejects_a_request_with_a_missing_invoice_number()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        var request = ValidRequest() with { InvoiceNumber = "" };

        var response = await client.PostAsJsonAsync(PdfEndpoint, request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Invoice number is required.", body);
    }
}
