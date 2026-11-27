using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
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
    public async Task A_request_with_no_documentTypeLabel_field_still_renders_with_the_default_Invoice_label()
    {
        // Simulates a pre-IG-220 client - serializes ValidRequest() manually, omitting
        // documentTypeLabel entirely, to prove the field's C# default ("Invoice") is honored by
        // System.Text.Json's record-constructor binding when the JSON property is absent, not just
        // when a serialized record happens to include it.
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        var withoutLabel = JsonSerializer.SerializeToNode(ValidRequest())!.AsObject();
        withoutLabel.Remove("documentTypeLabel");

        var response = await client.PostAsync(PdfEndpoint, new StringContent(withoutLabel.ToJsonString(), Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal("%PDF"u8.ToArray(), bytes[..4]);
    }

    [Fact]
    public async Task An_estimate_labelled_request_renders_different_bytes_than_the_same_request_labelled_invoice()
    {
        // IG-220 AC: "visually distinguishable... labelling on screen and PDF." Rendered PDF bytes
        // differing when the only change is DocumentTypeLabel is indirect but solid proof the field
        // actually reaches the rendered output, not just plumbed through unused.
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var invoiceResponse = await client.PostAsJsonAsync(PdfEndpoint, ValidRequest());
        var estimateResponse = await client.PostAsJsonAsync(PdfEndpoint, ValidRequest() with { DocumentTypeLabel = "Estimate" });

        var invoiceBytes = await invoiceResponse.Content.ReadAsByteArrayAsync();
        var estimateBytes = await estimateResponse.Content.ReadAsByteArrayAsync();
        Assert.NotEqual(invoiceBytes, estimateBytes);
    }

    [Theory]
    [InlineData("Banner")]
    [InlineData("Bordered")]
    [InlineData("Plain")]
    public async Task Renders_long_invoices_with_each_header_style(string headerStyle)
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        var request = ValidRequest() with
        {
            Items = Enumerable.Range(1, 65)
                .Select(i => new InvoicePdfLineItem($"Design and production work, batch {i}", 2, null, 50, 10, 0))
                .ToList(),
            TemplateCustomization = new InvoiceTemplateCustomization("#171717", "#563389", "Arial, Helvetica, sans-serif", headerStyle),
        };

        var response = await client.PostAsJsonAsync(PdfEndpoint, request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal("%PDF"u8.ToArray(), bytes[..4]);
    }

    [Theory]
    [InlineData("studio")]
    [InlineData("ledger")]
    [InlineData("horizon")]
    public async Task New_layout_renders_multipage_invoices_with_brand_colours_and_a_logo(string code)
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        var request = ValidRequest() with
        {
            TemplateCode = code,
            TemplateCustomization = new InvoiceTemplateCustomization("#090909", "#213E69", "Arial, Helvetica, sans-serif", "Bordered"),
            Items = Enumerable.Range(1, 95)
                .Select(i => new InvoicePdfLineItem($"Product design engagement, batch {i}", 2, null, 50, 10, 0))
                .ToList(),
            Reference = "PO-112",
            ShipTo = "Customer receiving location",
            Terms = "Net 14",
            Notes = "Thank you for your business.",
            CustomInstructions = "Use the invoice number as reference.",
            Logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/WZkAAAAASUVORK5CYII=",
        };

        var response = await client.PostAsJsonAsync(PdfEndpoint, request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal("%PDF"u8.ToArray(), bytes[..4]);
        var pdfStructure = Encoding.ASCII.GetString(bytes);
        Assert.True(System.Text.RegularExpressions.Regex.Matches(pdfStructure, @"/Type /Page\b").Count > 1);
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
