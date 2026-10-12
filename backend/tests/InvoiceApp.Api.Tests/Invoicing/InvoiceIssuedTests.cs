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

/// <summary>IG-315 (An invoice has no stored signal that it was ever issued): Invoice.IssuedAt is set
/// by a successful email send and by an explicit mark-as-issued action, and is never set by a failed
/// send, a draft, or a cancelled invoice.</summary>
public class InvoiceIssuedTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static InvoiceSaveRequest ValidRequest(string invoiceNumber) => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: DateOnly.Parse("2030-01-01"),
        DueDate: DateOnly.Parse("2030-01-16"),
        Reference: null,
        Currency: "AUD",
        Seller: "My Business",
        Customer: "Acme Pty Ltd\n123 Main St",
        ShipTo: null,
        Items: [new InvoiceSaveLineItem("Consulting", 1, "Hour", 100, 10, 0)],
        InvoiceDiscountType: DiscountType.None,
        InvoiceDiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: null,
        Terms: null,
        CustomInstructions: null,
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    private static InvoiceEmailRequest EmailRequest() => new(
        To: ["customer@example.com"],
        Cc: [],
        Subject: "Invoice from My Business",
        Message: "Please find your invoice attached.");

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> CreateInvoiceAsync(HttpClient client, string number)
    {
        var response = await client.PostAsJsonAsync(await DefaultBusinessRoutes.InvoicesRouteAsync(client), ValidRequest(number));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions))!.Id;
    }

    private static async Task<DateTimeOffset?> IssuedAtAsync(AuthenticatedRouteTestFactory factory, Guid invoiceId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return (await db.Invoices.AsNoTracking().SingleAsync(i => i.Id == invoiceId)).IssuedAt;
    }

    [Fact]
    public async Task A_successful_email_send_marks_the_invoice_issued()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "issued-by-email@example.com");
        var invoiceId = await CreateInvoiceAsync(client, "INV-ISSUED-EMAIL");
        Assert.Null(await IssuedAtAsync(factory, invoiceId));

        var response = await client.PostAsJsonAsync($"{await DefaultBusinessRoutes.InvoicesRouteAsync(client)}/{invoiceId}/send-email", EmailRequest());

        response.EnsureSuccessStatusCode();
        Assert.NotNull(await IssuedAtAsync(factory, invoiceId));
    }

    [Fact]
    public async Task A_failed_email_send_does_not_mark_the_invoice_issued()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "issued-failed-email@example.com");
        var invoiceId = await CreateInvoiceAsync(client, "INV-NOT-ISSUED");
        factory.InvoiceEmailSender.ThrowOnSend = new InvalidOperationException("SMTP connection refused");

        await client.PostAsJsonAsync($"{await DefaultBusinessRoutes.InvoicesRouteAsync(client)}/{invoiceId}/send-email", EmailRequest());

        Assert.Null(await IssuedAtAsync(factory, invoiceId));
    }

    [Fact]
    public async Task Mark_as_issued_records_the_date_and_shows_on_the_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "issued-manual@example.com");
        var invoiceId = await CreateInvoiceAsync(client, "INV-MANUAL");

        var response = await client.PostAsync($"{await DefaultBusinessRoutes.InvoicesRouteAsync(client)}/{invoiceId}/mark-issued", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var detail = await response.Content.ReadFromJsonAsync<InvoiceDetailDto>(JsonOptions);
        Assert.NotNull(detail!.IssuedAt);
        Assert.NotNull(await IssuedAtAsync(factory, invoiceId));
    }

    [Fact]
    public async Task Marking_an_invoice_issued_twice_keeps_the_first_date()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "issued-twice@example.com");
        var invoiceId = await CreateInvoiceAsync(client, "INV-TWICE");
        var route = await DefaultBusinessRoutes.InvoicesRouteAsync(client);

        await client.PostAsync($"{route}/{invoiceId}/mark-issued", null);
        var first = await IssuedAtAsync(factory, invoiceId);
        var second = await client.PostAsync($"{route}/{invoiceId}/mark-issued", null);

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(first, await IssuedAtAsync(factory, invoiceId));
    }

    [Fact]
    public async Task A_cancelled_invoice_cannot_be_marked_issued()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "issued-cancelled@example.com");
        var invoiceId = await CreateInvoiceAsync(client, "INV-CANCEL-ISSUE");
        var route = await DefaultBusinessRoutes.InvoicesRouteAsync(client);
        await client.PostAsync($"{route}/{invoiceId}/cancel", null);

        var response = await client.PostAsync($"{route}/{invoiceId}/mark-issued", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Null(await IssuedAtAsync(factory, invoiceId));
    }

    [Fact]
    public async Task Another_account_cannot_mark_my_invoice_issued()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "issued-owner@example.com");
        var invoiceId = await CreateInvoiceAsync(owner, "INV-OWNED");

        using var intruder = await RegisteredClientAsync(factory, "issued-intruder@example.com");
        var response = await intruder.PostAsync($"{await DefaultBusinessRoutes.InvoicesRouteAsync(owner)}/{invoiceId}/mark-issued", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Null(await IssuedAtAsync(factory, invoiceId));
    }
}
