using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Api.Tests.Invoicing;

/// <summary>Verifies IG-213: every send attempt (successful or failed) is recorded and visible
/// via the email-history endpoint, account-owned like everything else.</summary>
public class InvoiceEmailHistoryEndpointTests
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

    private static async Task<List<InvoiceEmailLogDto>> GetHistoryAsync(HttpClient client, Guid invoiceId)
    {
        var response = await client.GetAsync($"{InvoicesEndpoint}/{invoiceId}/email-history");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<List<InvoiceEmailLogDto>>(JsonOptions))!;
    }

    [Fact]
    public async Task Is_empty_for_an_invoice_that_has_never_been_emailed()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "history-empty@example.com");
        var created = await (await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-HIST-1"))).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var history = await GetHistoryAsync(client, created!.Id);

        Assert.Empty(history);
    }

    [Fact]
    public async Task Records_a_sent_entry_with_recipients_subject_and_timestamp_after_a_successful_send()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "history-sent@example.com");
        var created = await (await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-HIST-2"))).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        var before = DateTimeOffset.UtcNow;

        await client.PostAsJsonAsync($"{InvoicesEndpoint}/{created!.Id}/send-email", EmailRequest());
        var history = await GetHistoryAsync(client, created.Id);

        var entry = Assert.Single(history);
        Assert.Equal(InvoiceEmailStatus.Sent, entry.Status);
        Assert.Equal(["customer@example.com"], entry.To);
        Assert.Equal(["accounts@example.com"], entry.Cc);
        Assert.Equal("Invoice from My Business", entry.Subject);
        Assert.True(entry.SentAt >= before);
    }

    [Fact]
    public async Task Records_a_failed_entry_and_still_returns_an_error_when_delivery_throws()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "history-failed@example.com");
        var created = await (await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-HIST-3"))).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        factory.InvoiceEmailSender.ThrowOnSend = new InvalidOperationException("SMTP connection refused");

        var sendResponse = await client.PostAsJsonAsync($"{InvoicesEndpoint}/{created!.Id}/send-email", EmailRequest());

        Assert.Equal(HttpStatusCode.InternalServerError, sendResponse.StatusCode);
        var history = await GetHistoryAsync(client, created.Id);
        var entry = Assert.Single(history);
        Assert.Equal(InvoiceEmailStatus.Failed, entry.Status);
        Assert.Empty(factory.InvoiceEmailSender.SentMessages);
    }

    [Fact]
    public async Task Accumulates_multiple_sends_newest_first()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "history-multiple@example.com");
        var created = await (await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-HIST-4"))).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        await client.PostAsJsonAsync($"{InvoicesEndpoint}/{created!.Id}/send-email", EmailRequest());
        await client.PostAsJsonAsync($"{InvoicesEndpoint}/{created.Id}/send-email", EmailRequest() with { Subject = "Second send" });

        var history = await GetHistoryAsync(client, created.Id);

        Assert.Equal(2, history.Count);
        Assert.Equal("Second send", history[0].Subject);
        Assert.Equal("Invoice from My Business", history[1].Subject);
    }

    [Fact]
    public async Task Requires_a_session()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.GetAsync($"{InvoicesEndpoint}/{Guid.NewGuid()}/email-history");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Someone_elses_invoice_404s()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "history-owner@example.com");
        var created = await (await ownerClient.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-HIST-5"))).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        using var otherClient = await RegisteredClientAsync(factory, "history-other@example.com");

        var response = await otherClient.GetAsync($"{InvoicesEndpoint}/{created!.Id}/email-history");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
