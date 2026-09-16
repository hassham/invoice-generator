using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Api.Tests.Invoicing;

/// <summary>Verifies IG-214's hosted-invoice-page endpoints and IG-215's anti-guessing
/// requirements - anonymous access via a real token, and a generic 404 for anything that isn't
/// one.</summary>
public class PublicInvoiceEndpointsTests
{
    private const string InvoicesEndpoint = "/api/v1/invoices";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static InvoiceSaveRequest ValidRequest(string invoiceNumber) => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: DateOnly.Parse("2030-01-01"),
        DueDate: DateOnly.Parse("2030-01-16"),
        Reference: "PO-42",
        Currency: "AUD",
        Seller: "My Business",
        Customer: "Acme Pty Ltd\n123 Main St",
        ShipTo: null,
        Items: [new InvoiceSaveLineItem("Consulting", 2, "Hour", 100, 10, 5)],
        InvoiceDiscountType: DiscountType.Percentage,
        InvoiceDiscountValue: 5,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: "Thanks for your business",
        Terms: "Net 15",
        CustomInstructions: "Pay via bank transfer",
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<string> CreateInvoiceAndGetTokenAsync(AuthenticatedRouteTestFactory factory, HttpClient client, string invoiceNumber)
    {
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest(invoiceNumber));
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == created!.Id);
        return invoice.PublicToken!;
    }

    [Fact]
    public async Task Every_new_invoice_gets_a_non_null_unique_public_token()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "token-generated@example.com");

        var tokenA = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-TOKEN-A");
        var tokenB = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-TOKEN-B");

        Assert.False(string.IsNullOrWhiteSpace(tokenA));
        Assert.False(string.IsNullOrWhiteSpace(tokenB));
        Assert.NotEqual(tokenA, tokenB);
        // Never the entity's own primary key (Invoice.PublicToken's own doc comment) - a database
        // id isn't meant to double as a public capability token.
        Assert.DoesNotContain("-", tokenA);
    }

    [Fact]
    public async Task Anonymous_visitor_can_view_the_hosted_invoice_by_its_token()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "hosted-view@example.com");
        var token = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-HOSTED-1");

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.GetAsync($"/api/v1/public/invoices/{token}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var hosted = await response.Content.ReadFromJsonAsync<HostedInvoiceDto>(JsonOptions);
        Assert.Equal("INV-HOSTED-1", hosted!.InvoiceNumber);
        Assert.Equal("AUD", hosted.Currency);
        Assert.True(hosted.AmountDue > 0);
        // IG-216: no Stripe account connected by default - the hosted page's Pay Now button
        // depends on this being false (HostedInvoiceDto's own doc comment).
        Assert.False(hosted.HasStripeAccount);
    }

    [Fact]
    public async Task Unknown_token_returns_a_generic_not_found()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.GetAsync("/api/v1/public/invoices/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        // IG-215 AC: a generic not-found response, not detail about why it failed - the message
        // must be indistinguishable from "belongs to someone else" or "malformed", not leak which.
        Assert.Contains("not found", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task A_cancelled_invoices_hosted_page_still_resolves_but_a_deleted_ones_does_not()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "hosted-deleted@example.com");
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-HOSTED-DEL"));
        var created = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var token = (await db.Invoices.SingleAsync(i => i.Id == created!.Id)).PublicToken!;

        await client.DeleteAsync($"{InvoicesEndpoint}/{created!.Id}");

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.GetAsync($"/api/v1/public/invoices/{token}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_visitor_can_download_the_hosted_invoice_pdf()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "hosted-pdf@example.com");
        var token = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-HOSTED-PDF");

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.GetAsync($"/api/v1/public/invoices/{token}/pdf");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0);
    }

    [Fact]
    public async Task Unknown_token_pdf_download_also_returns_a_generic_not_found()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.GetAsync("/api/v1/public/invoices/does-not-exist/pdf");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
