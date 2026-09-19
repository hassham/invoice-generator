using System.Net;
using System.Net.Http.Json;
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

/// <summary>Verifies IG-216's "pay a hosted invoice online" endpoints: Checkout session creation
/// against a connected Stripe account, its guardrails (no Stripe account / cancelled / already
/// paid), and confirmation's server-side verification + idempotency.</summary>
public class HostedCheckoutEndpointsTests
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

    private static async Task<(Guid InvoiceId, string Token)> CreateInvoiceAndGetTokenAsync(AuthenticatedRouteTestFactory factory, HttpClient client, string invoiceNumber)
    {
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest(invoiceNumber));
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == created!.Id);
        return (invoice.Id, invoice.PublicToken!);
    }

    private static async Task ConnectStripeAsync(AuthenticatedRouteTestFactory factory, string invoiceNumber, string accountId = "acct_test123")
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.InvoiceNumber == invoiceNumber);
        var business = await db.Businesses.SingleAsync(b => b.Id == invoice.BusinessId);
        business.StripeAccountId = accountId;
        business.StripeConnectedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Pay_now_opens_a_checkout_session_for_the_exact_outstanding_amount_when_stripe_is_connected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "checkout-create@example.com");
        var (_, token) = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-CHK-1");
        await ConnectStripeAsync(factory, "INV-CHK-1");

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.PostAsync($"/api/v1/public/invoices/{token}/checkout-session", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<CheckoutSessionDto>(JsonOptions);
        Assert.Equal(factory.StripeCheckoutService.SessionUrlToReturn, session!.Url);

        var createdRequest = Assert.Single(factory.StripeCheckoutService.CreatedSessions);
        Assert.Equal("acct_test123", createdRequest.StripeAccountId);
        Assert.Equal(token, createdRequest.PublicToken);
        Assert.True(createdRequest.AmountDue > 0);
    }

    [Fact]
    public async Task Pay_now_is_rejected_when_the_business_has_no_stripe_account_connected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "checkout-no-stripe@example.com");
        var (_, token) = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-CHK-2");

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.PostAsync($"/api/v1/public/invoices/{token}/checkout-session", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Empty(factory.StripeCheckoutService.CreatedSessions);
    }

    [Fact]
    public async Task Pay_now_is_rejected_for_a_cancelled_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "checkout-cancelled@example.com");
        var (invoiceId, token) = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-CHK-3");
        await ConnectStripeAsync(factory, "INV-CHK-3");
        await client.PostAsync($"{InvoicesEndpoint}/{invoiceId}/cancel", null);

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.PostAsync($"/api/v1/public/invoices/{token}/checkout-session", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Empty(factory.StripeCheckoutService.CreatedSessions);
    }

    [Fact]
    public async Task Pay_now_is_rejected_once_the_invoice_is_already_paid_in_full()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "checkout-paid@example.com");
        var (invoiceId, token) = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-CHK-4");
        await ConnectStripeAsync(factory, "INV-CHK-4");

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == invoiceId);
        invoice.AmountPaid = invoice.TotalAmount;
        invoice.AmountDue = 0;
        invoice.Status = InvoiceStatus.Paid;
        await db.SaveChangesAsync();

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.PostAsync($"/api/v1/public/invoices/{token}/checkout-session", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Confirming_a_paid_session_records_a_payment_and_marks_the_invoice_paid()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "checkout-confirm@example.com");
        var (invoiceId, token) = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-CHK-5");
        await ConnectStripeAsync(factory, "INV-CHK-5");

        using var anonymousClient = factory.CreateClient();
        var createResponse = await anonymousClient.PostAsync($"/api/v1/public/invoices/{token}/checkout-session", null);
        createResponse.EnsureSuccessStatusCode();
        var sessionId = factory.StripeCheckoutService.SessionIdToReturn;

        var confirmResponse = await anonymousClient.GetAsync($"/api/v1/public/invoices/{token}/checkout-session/{sessionId}");

        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);
        var confirmation = await confirmResponse.Content.ReadFromJsonAsync<CheckoutConfirmationDto>(JsonOptions);
        Assert.True(confirmation!.Paid);
        Assert.Equal(InvoiceStatus.Paid, confirmation.Invoice.Status);
        Assert.Equal(0, confirmation.Invoice.AmountDue);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var payment = await db.Payments.SingleAsync(p => p.InvoiceId == invoiceId);
        Assert.Equal(sessionId, payment.StripeCheckoutSessionId);
        Assert.Null(payment.CreatedBy);
        Assert.Equal(Domain.Payments.PaymentMethod.Card, payment.PaymentMethod);

        // IG-218: the redirect-based confirm path shares the same receipt-sending logic as the
        // webhook - a receipt goes out here too, not only when a webhook happens to arrive.
        var receipt = Assert.Single(factory.InvoiceEmailSender.SentMessages);
        Assert.Contains(factory.StripeCheckoutService.PayerEmailToReturn, receipt.To);
    }

    [Fact]
    public async Task Confirming_the_same_session_twice_records_only_one_payment()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "checkout-idempotent@example.com");
        var (invoiceId, token) = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-CHK-6");
        await ConnectStripeAsync(factory, "INV-CHK-6");

        using var anonymousClient = factory.CreateClient();
        await anonymousClient.PostAsync($"/api/v1/public/invoices/{token}/checkout-session", null);
        var sessionId = factory.StripeCheckoutService.SessionIdToReturn;

        await anonymousClient.GetAsync($"/api/v1/public/invoices/{token}/checkout-session/{sessionId}");
        var secondResponse = await anonymousClient.GetAsync($"/api/v1/public/invoices/{token}/checkout-session/{sessionId}");

        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
        var confirmation = await secondResponse.Content.ReadFromJsonAsync<CheckoutConfirmationDto>(JsonOptions);
        Assert.True(confirmation!.Paid);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var paymentCount = await db.Payments.CountAsync(p => p.InvoiceId == invoiceId);
        Assert.Equal(1, paymentCount);
    }

    [Fact]
    public async Task Confirming_a_session_created_for_a_different_invoice_does_not_mark_this_one_paid()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "checkout-wrong-invoice@example.com");
        var (_, tokenA) = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-CHK-7A");
        var (invoiceIdB, tokenB) = await CreateInvoiceAndGetTokenAsync(factory, client, "INV-CHK-7B");
        await ConnectStripeAsync(factory, "INV-CHK-7A");
        await ConnectStripeAsync(factory, "INV-CHK-7B");

        using var anonymousClient = factory.CreateClient();
        // A session is created for invoice A, but the fake always hands back the same
        // SessionIdToReturn - simulating an attacker replaying invoice A's real session id against
        // invoice B's confirm endpoint.
        await anonymousClient.PostAsync($"/api/v1/public/invoices/{tokenA}/checkout-session", null);
        var sessionId = factory.StripeCheckoutService.SessionIdToReturn;

        var response = await anonymousClient.GetAsync($"/api/v1/public/invoices/{tokenB}/checkout-session/{sessionId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var confirmation = await response.Content.ReadFromJsonAsync<CheckoutConfirmationDto>(JsonOptions);
        Assert.False(confirmation!.Paid);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoiceB = await db.Invoices.SingleAsync(i => i.Id == invoiceIdB);
        Assert.Equal(InvoiceStatus.Draft, invoiceB.Status);
        Assert.True(invoiceB.AmountDue > 0);
    }

    [Fact]
    public async Task Unknown_token_checkout_session_creation_returns_a_generic_not_found()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.PostAsync("/api/v1/public/invoices/does-not-exist/checkout-session", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
