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

/// <summary>Verifies IG-212's send-by-email endpoint: the PDF is attached, the hosted link is
/// included, and account-ownership/validation are both enforced.</summary>
public class InvoiceSendEmailEndpointTests
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

    private static InvoiceEmailRequest EmailRequest() => new(
        To: ["customer@example.com"],
        Cc: ["accounts@example.com"],
        Subject: "Invoice from My Business",
        Message: "Please find your invoice attached.");

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    [Fact]
    public async Task Sending_a_valid_invoice_attaches_the_pdf_and_includes_the_hosted_link()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "send-email-valid@example.com");
        var created = await (await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-EMAIL-1"))).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var response = await client.PostAsJsonAsync($"{InvoicesEndpoint}/{created!.Id}/send-email", EmailRequest());

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var sent = Assert.Single(factory.InvoiceEmailSender.SentMessages);
        Assert.Equal(["customer@example.com"], sent.To);
        Assert.Equal(["accounts@example.com"], sent.Cc);
        Assert.Equal("Invoice from My Business", sent.Subject);
        var attachment = Assert.Single(sent.Attachments);
        Assert.Equal("application/pdf", attachment.ContentType);
        Assert.True(attachment.Content.Length > 0);
        Assert.Contains("Please find your invoice attached.", sent.PlainTextBody);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var token = (await db.Invoices.SingleAsync(i => i.Id == created.Id)).PublicToken;
        Assert.Contains($"/i/{token}", sent.PlainTextBody);
    }

    [Fact]
    public async Task Sending_without_a_session_is_unauthorized()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.PostAsJsonAsync($"{InvoicesEndpoint}/{Guid.NewGuid()}/send-email", EmailRequest());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(factory.InvoiceEmailSender.SentMessages);
    }

    [Fact]
    public async Task Sending_someone_elses_invoice_404s_and_sends_nothing()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "send-email-owner@example.com");
        var created = await (await ownerClient.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-EMAIL-2"))).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        using var otherClient = await RegisteredClientAsync(factory, "send-email-other@example.com");

        var response = await otherClient.PostAsJsonAsync($"{InvoicesEndpoint}/{created!.Id}/send-email", EmailRequest());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Empty(factory.InvoiceEmailSender.SentMessages);
    }

    [Fact]
    public async Task Rejects_a_request_with_no_recipients_and_sends_nothing()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "send-email-invalid@example.com");
        var created = await (await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-EMAIL-3"))).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var response = await client.PostAsJsonAsync($"{InvoicesEndpoint}/{created!.Id}/send-email", EmailRequest() with { To = [] });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.InvoiceEmailSender.SentMessages);
    }

    [Fact]
    public async Task Backfills_a_missing_public_token_before_sending_for_an_invoice_created_before_that_column_existed()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "send-email-backfill@example.com");
        var created = await (await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-EMAIL-4"))).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var invoice = await db.Invoices.SingleAsync(i => i.Id == created!.Id);
            invoice.PublicToken = null;
            await db.SaveChangesAsync();
        }

        var response = await client.PostAsJsonAsync($"{InvoicesEndpoint}/{created!.Id}/send-email", EmailRequest());

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var sent = Assert.Single(factory.InvoiceEmailSender.SentMessages);
        Assert.DoesNotContain("/i/\n", sent.PlainTextBody);
        Assert.Matches(@"/i/[A-Za-z0-9]{16}", sent.PlainTextBody);
    }
}
