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
using InvoiceApp.Domain.Payments;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Api.Tests.Payments;

/// <summary>
/// Verifies IG-11's own AC at the real HTTP pipeline level (FSD sections 66-72): recording and
/// removing payments recalculates AmountPaid/AmountDue/Status correctly, overpayment and
/// non-positive amounts are rejected, a Cancelled invoice blocks new payments but still allows
/// removal, account ownership is enforced (anti-enumeration 404s), and both actions are audit
/// logged.
/// </summary>
public class PaymentEndpointsTests
{
    private const string InvoicesEndpoint = "/api/v1/invoices";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static InvoiceSaveRequest ValidRequest(string invoiceNumber) => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: new DateOnly(2030, 8, 1),
        DueDate: new DateOnly(2030, 8, 15),
        Reference: null,
        Currency: "AUD",
        Seller: "My Business",
        Customer: "Acme Pty Ltd",
        ShipTo: null,
        // Quantity 1 x UnitPrice 100, 0 tax, 0 discount -> TotalAmount 100 exactly, a convenient
        // round figure for partial/full-payment arithmetic below.
        Items: [new InvoiceSaveLineItem("Consulting", 1, null, 100, 0, 0)],
        InvoiceDiscountType: DiscountType.None,
        InvoiceDiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: null,
        Terms: null,
        CustomInstructions: null,
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    private static PaymentRequest ValidPaymentRequest(decimal amount) =>
        new(new DateOnly(2030, 8, 5), amount, PaymentMethod.Cash, "REF-1", "Thanks");

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> CreateInvoiceAsync(HttpClient client, string invoiceNumber)
    {
        var response = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest(invoiceNumber));
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        return created!.Id;
    }

    private static async Task SetInvoiceStatusAsync(AuthenticatedRouteTestFactory factory, Guid invoiceId, InvoiceStatus status)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == invoiceId);
        invoice.Status = status;
        await db.SaveChangesAsync();
    }

    private static string PaymentsEndpoint(Guid invoiceId) => $"{InvoicesEndpoint}/{invoiceId}/payments";

    [Fact]
    public async Task Recording_a_full_payment_marks_the_invoice_paid()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pay-full@example.com");
        var id = await CreateInvoiceAsync(client, "INV-PAY-1");

        var response = await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(100m));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PaymentRecordResult>(JsonOptions);
        Assert.Equal(InvoiceStatus.Paid, result!.Invoice.Status);
        Assert.Equal(100m, result.Invoice.AmountPaid);
        Assert.Equal(0m, result.Invoice.AmountDue);
        Assert.Equal($"{PaymentsEndpoint(id)}/{result.Payment.Id}", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task Recording_a_partial_payment_marks_the_invoice_partially_paid()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pay-partial@example.com");
        var id = await CreateInvoiceAsync(client, "INV-PAY-2");

        var response = await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(40m));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PaymentRecordResult>(JsonOptions);
        Assert.Equal(InvoiceStatus.PartiallyPaid, result!.Invoice.Status);
        Assert.Equal(40m, result.Invoice.AmountPaid);
        Assert.Equal(60m, result.Invoice.AmountDue);
    }

    [Fact]
    public async Task Rejects_a_payment_that_would_overpay_the_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pay-over@example.com");
        var id = await CreateInvoiceAsync(client, "INV-PAY-3");

        var response = await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(150m));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var getResponse = await client.GetAsync($"{InvoicesEndpoint}/{id}");
        var detail = await getResponse.Content.ReadFromJsonAsync<InvoiceDetailDto>(JsonOptions);
        Assert.Equal(0m, detail!.AmountPaid);
    }

    [Fact]
    public async Task Rejects_a_second_payment_that_would_overpay_the_remaining_balance()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pay-over2@example.com");
        var id = await CreateInvoiceAsync(client, "INV-PAY-4");
        await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(60m));

        var response = await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(60m));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-10)]
    public async Task Rejects_a_non_positive_payment_amount(decimal amount)
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, $"pay-nonpositive-{amount}@example.com");
        var id = await CreateInvoiceAsync(client, $"INV-PAY-NP-{amount}");

        var response = await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(amount));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Rejects_recording_a_payment_on_a_cancelled_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pay-cancelled@example.com");
        var id = await CreateInvoiceAsync(client, "INV-PAY-5");
        await client.PostAsync($"{InvoicesEndpoint}/{id}/cancel", null);

        var response = await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(50m));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Removing_a_payment_recalculates_balance_and_reverts_to_draft_when_fully_removed()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pay-remove@example.com");
        var id = await CreateInvoiceAsync(client, "INV-PAY-6");
        var recordResponse = await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(100m));
        var recorded = await recordResponse.Content.ReadFromJsonAsync<PaymentRecordResult>(JsonOptions);

        var response = await client.DeleteAsync($"{PaymentsEndpoint(id)}/{recorded!.Payment.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        Assert.Equal(InvoiceStatus.Draft, updated!.Status);
        Assert.Equal(0m, updated.AmountPaid);
        Assert.Equal(100m, updated.AmountDue);
    }

    [Fact]
    public async Task Removing_one_of_two_payments_leaves_the_invoice_partially_paid()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pay-remove2@example.com");
        var id = await CreateInvoiceAsync(client, "INV-PAY-7");
        var first = await (await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(30m))).Content.ReadFromJsonAsync<PaymentRecordResult>(JsonOptions);
        await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(30m));

        var response = await client.DeleteAsync($"{PaymentsEndpoint(id)}/{first!.Payment.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        Assert.Equal(InvoiceStatus.PartiallyPaid, updated!.Status);
        Assert.Equal(30m, updated.AmountPaid);
    }

    [Fact]
    public async Task Removing_a_payment_from_a_cancelled_invoice_updates_balance_but_leaves_status_cancelled()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pay-remove-cancelled@example.com");
        var id = await CreateInvoiceAsync(client, "INV-PAY-8");
        var recorded = await (await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(40m))).Content.ReadFromJsonAsync<PaymentRecordResult>(JsonOptions);
        await SetInvoiceStatusAsync(factory, id, InvoiceStatus.Cancelled);

        var response = await client.DeleteAsync($"{PaymentsEndpoint(id)}/{recorded!.Payment.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        Assert.Equal(InvoiceStatus.Cancelled, updated!.Status);
        Assert.Equal(0m, updated.AmountPaid);
    }

    [Fact]
    public async Task Lists_payments_newest_first()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pay-list@example.com");
        var id = await CreateInvoiceAsync(client, "INV-PAY-9");
        await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(20m));
        await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(20m));

        var response = await client.GetAsync(PaymentsEndpoint(id));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payments = await response.Content.ReadFromJsonAsync<List<PaymentDto>>(JsonOptions);
        Assert.Equal(2, payments!.Count);
    }

    [Fact]
    public async Task Cannot_record_a_payment_on_another_accounts_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "pay-owner@example.com");
        var id = await CreateInvoiceAsync(ownerClient, "INV-PAY-10");
        using var otherClient = await RegisteredClientAsync(factory, "pay-other@example.com");

        var response = await otherClient.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(10m));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Cannot_list_payments_on_another_accounts_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "pay-owner2@example.com");
        var id = await CreateInvoiceAsync(ownerClient, "INV-PAY-11");
        using var otherClient = await RegisteredClientAsync(factory, "pay-other2@example.com");

        var response = await otherClient.GetAsync(PaymentsEndpoint(id));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Cannot_remove_a_payment_on_another_accounts_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "pay-owner3@example.com");
        var id = await CreateInvoiceAsync(ownerClient, "INV-PAY-12");
        var recorded = await (await ownerClient.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(10m))).Content.ReadFromJsonAsync<PaymentRecordResult>(JsonOptions);
        using var otherClient = await RegisteredClientAsync(factory, "pay-other3@example.com");

        var response = await otherClient.DeleteAsync($"{PaymentsEndpoint(id)}/{recorded!.Payment.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Endpoints_require_a_session()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();
        var invoiceId = Guid.NewGuid();

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymousClient.GetAsync(PaymentsEndpoint(invoiceId))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymousClient.PostAsJsonAsync(PaymentsEndpoint(invoiceId), ValidPaymentRequest(10m))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymousClient.DeleteAsync($"{PaymentsEndpoint(invoiceId)}/{Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public async Task Recording_a_payment_writes_an_audit_log_entry()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pay-audit-record@example.com");
        var id = await CreateInvoiceAsync(client, "INV-PAY-13");

        var recorded = await (await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(25m))).Content.ReadFromJsonAsync<PaymentRecordResult>(JsonOptions);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var entry = await db.AuditLogs.SingleAsync(log => log.EntityId == recorded!.Payment.Id && log.Action == "Payment recorded");
        Assert.Equal("Payment", entry.EntityType);
    }

    [Fact]
    public async Task Removing_a_payment_writes_an_audit_log_entry()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pay-audit-remove@example.com");
        var id = await CreateInvoiceAsync(client, "INV-PAY-14");
        var recorded = await (await client.PostAsJsonAsync(PaymentsEndpoint(id), ValidPaymentRequest(25m))).Content.ReadFromJsonAsync<PaymentRecordResult>(JsonOptions);

        await client.DeleteAsync($"{PaymentsEndpoint(id)}/{recorded!.Payment.Id}");

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var entry = await db.AuditLogs.SingleAsync(log => log.EntityId == recorded!.Payment.Id && log.Action == "Payment removed");
        Assert.Equal("Payment", entry.EntityType);
    }
}
