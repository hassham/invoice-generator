using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Application.Payments;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Api.Tests.Payments;

/// <summary>Verifies IG-217's webhook endpoint wiring: a validly-signed paid-session event
/// reconciles the payment via the same idempotent logic IG-216's confirm endpoint uses, an
/// invalid signature is rejected, and a replayed event never double-records. Real HMAC signature
/// verification itself is covered separately by StripeWebhookServiceTests.</summary>
public class StripeWebhookEndpointsTests
{
    private const string InvoicesEndpoint = "/api/v1/invoices";
    private const string WebhookEndpoint = "/api/v1/webhooks/stripe";

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
        Notes: null,
        Terms: null,
        CustomInstructions: null,
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

    private static async Task<(Guid InvoiceId, string Token)> CreateConnectedInvoiceAsync(AuthenticatedRouteTestFactory factory, HttpClient client, string invoiceNumber)
    {
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest(invoiceNumber));
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == created!.Id);
        var business = await db.Businesses.SingleAsync(b => b.Id == invoice.BusinessId);
        business.StripeAccountId = "acct_test123";
        business.StripeConnectedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        return (invoice.Id, invoice.PublicToken!);
    }

    [Fact]
    public async Task A_paid_session_event_records_the_payment_and_marks_the_invoice_paid()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "webhook-paid@example.com");
        var (invoiceId, token) = await CreateConnectedInvoiceAsync(factory, client, "INV-WH-1");

        factory.StripeWebhookService.ResultToReturn = new StripeWebhookParseResult(true, "cs_test_wh1", token, true, 209, "payer@example.com");

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.PostAsync(WebhookEndpoint, new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == invoiceId);
        Assert.Equal(InvoiceStatus.Paid, invoice.Status);
        var payment = await db.Payments.SingleAsync(p => p.InvoiceId == invoiceId);
        Assert.Equal("cs_test_wh1", payment.StripeCheckoutSessionId);
        Assert.Null(payment.CreatedBy);

        // IG-218: a receipt email is sent once the webhook confirms payment, referencing the
        // invoice number and amount paid.
        var receipt = Assert.Single(factory.InvoiceEmailSender.SentMessages);
        Assert.Equal(["payer@example.com"], receipt.To);
        Assert.Contains("INV-WH-1", receipt.Subject);
    }

    [Fact]
    public async Task An_invalid_signature_is_rejected_and_records_nothing()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "webhook-invalid-sig@example.com");
        var (invoiceId, token) = await CreateConnectedInvoiceAsync(factory, client, "INV-WH-2");

        factory.StripeWebhookService.ResultToReturn = new StripeWebhookParseResult(false, "cs_test_wh2", token, true, 209, "payer@example.com");

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.PostAsync(WebhookEndpoint, new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == invoiceId);
        Assert.Equal(InvoiceStatus.Draft, invoice.Status);
        Assert.False(await db.Payments.AnyAsync(p => p.InvoiceId == invoiceId));
    }

    [Fact]
    public async Task A_replayed_event_for_the_same_session_does_not_double_record_the_payment()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "webhook-replay@example.com");
        var (invoiceId, token) = await CreateConnectedInvoiceAsync(factory, client, "INV-WH-3");

        factory.StripeWebhookService.ResultToReturn = new StripeWebhookParseResult(true, "cs_test_wh3", token, true, 209, "payer@example.com");

        using var anonymousClient = factory.CreateClient();
        await anonymousClient.PostAsync(WebhookEndpoint, new StringContent("{}", Encoding.UTF8, "application/json"));
        var secondResponse = await anonymousClient.PostAsync(WebhookEndpoint, new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var paymentCount = await db.Payments.CountAsync(p => p.InvoiceId == invoiceId);
        Assert.Equal(1, paymentCount);
        // IG-218: a replayed event must not send a second receipt either.
        Assert.Single(factory.InvoiceEmailSender.SentMessages);
    }

    [Fact]
    public async Task A_receipt_send_failure_does_not_roll_back_or_block_the_already_recorded_payment()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "webhook-receipt-fails@example.com");
        var (invoiceId, token) = await CreateConnectedInvoiceAsync(factory, client, "INV-WH-5");
        factory.InvoiceEmailSender.ThrowOnSend = new InvalidOperationException("SMTP is down");

        factory.StripeWebhookService.ResultToReturn = new StripeWebhookParseResult(true, "cs_test_wh5", token, true, 209, "payer@example.com");

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.PostAsync(WebhookEndpoint, new StringContent("{}", Encoding.UTF8, "application/json"));

        // IG-218 AC: a receipt-send failure must never affect the already-recorded payment - the
        // webhook still acks 200, and the payment/invoice-status update both persisted.
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == invoiceId);
        Assert.Equal(InvoiceStatus.Paid, invoice.Status);
        Assert.True(await db.Payments.AnyAsync(p => p.InvoiceId == invoiceId && p.StripeCheckoutSessionId == "cs_test_wh5"));
    }

    [Fact]
    public async Task An_irrelevant_but_validly_signed_event_is_acknowledged_without_recording_anything()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "webhook-irrelevant@example.com");
        var (invoiceId, _) = await CreateConnectedInvoiceAsync(factory, client, "INV-WH-4");

        factory.StripeWebhookService.ResultToReturn = new StripeWebhookParseResult(true, null, null, false, null, null);

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.PostAsync(WebhookEndpoint, new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await db.Payments.AnyAsync(p => p.InvoiceId == invoiceId));
    }

    [Fact]
    public async Task A_webhook_for_a_session_whose_token_matches_no_invoice_is_acknowledged_but_ignored()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        factory.StripeWebhookService.ResultToReturn = new StripeWebhookParseResult(true, "cs_test_orphan", "does-not-exist", true, 100, "payer@example.com");

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.PostAsync(WebhookEndpoint, new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
