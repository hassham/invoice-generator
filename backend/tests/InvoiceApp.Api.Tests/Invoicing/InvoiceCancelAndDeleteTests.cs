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

/// <summary>
/// Verifies IG-49's own AC at the real HTTP pipeline level: cancellation and deletion follow FSD
/// sections 52/53's rules, unauthorized/disallowed operations are rejected, and both actions are
/// audit logged (IG-50's trail).
/// </summary>
public class InvoiceCancelAndDeleteTests
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

    [Fact]
    public async Task Cancelling_transitions_a_draft_invoice_to_cancelled()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cancel-draft@example.com");
        var id = await CreateInvoiceAsync(client, "INV-CANCEL-1");

        var response = await client.PostAsync($"{InvoicesEndpoint}/{id}/cancel", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        Assert.Equal(InvoiceStatus.Cancelled, updated!.Status);

        var getResponse = await client.GetAsync($"{InvoicesEndpoint}/{id}");
        var detail = await getResponse.Content.ReadFromJsonAsync<InvoiceDetailDto>(JsonOptions);
        Assert.Equal(InvoiceStatus.Cancelled, detail!.Status);
    }

    [Fact]
    public async Task Cancelling_an_already_cancelled_invoice_is_idempotent()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cancel-idempotent@example.com");
        var id = await CreateInvoiceAsync(client, "INV-CANCEL-2");
        await client.PostAsync($"{InvoicesEndpoint}/{id}/cancel", null);

        var response = await client.PostAsync($"{InvoicesEndpoint}/{id}/cancel", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        Assert.Equal(InvoiceStatus.Cancelled, updated!.Status);
    }

    [Fact]
    public async Task Cancelling_a_paid_invoice_is_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cancel-paid@example.com");
        var id = await CreateInvoiceAsync(client, "INV-CANCEL-3");
        await SetInvoiceStatusAsync(factory, id, InvoiceStatus.Paid);

        var response = await client.PostAsync($"{InvoicesEndpoint}/{id}/cancel", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var getResponse = await client.GetAsync($"{InvoicesEndpoint}/{id}");
        var detail = await getResponse.Content.ReadFromJsonAsync<InvoiceDetailDto>(JsonOptions);
        Assert.Equal(InvoiceStatus.Paid, detail!.Status);
    }

    [Fact]
    public async Task Cancelling_someone_elses_invoice_404s()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "cancel-owner@example.com");
        var id = await CreateInvoiceAsync(ownerClient, "INV-CANCEL-4");
        using var otherClient = await RegisteredClientAsync(factory, "cancel-other@example.com");

        var response = await otherClient.PostAsync($"{InvoicesEndpoint}/{id}/cancel", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Cancelling_without_a_session_is_unauthorized()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.PostAsync($"{InvoicesEndpoint}/{Guid.NewGuid()}/cancel", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Cancelling_writes_an_audit_log_entry()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cancel-audit@example.com");
        var id = await CreateInvoiceAsync(client, "INV-CANCEL-5");

        await client.PostAsync($"{InvoicesEndpoint}/{id}/cancel", null);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var entry = await db.AuditLogs.SingleAsync(log => log.EntityId == id && log.Action == "Invoice cancelled");
        Assert.Equal("Invoice", entry.EntityType);
    }

    [Fact]
    public async Task Deleting_removes_the_invoice_from_the_list_but_keeps_it_soft_deleted()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "delete-basic@example.com");
        var id = await CreateInvoiceAsync(client, "INV-DELETE-1");

        var response = await client.DeleteAsync($"{InvoicesEndpoint}/{id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var listResponse = await client.GetAsync(InvoicesEndpoint);
        var list = await listResponse.Content.ReadFromJsonAsync<InvoiceListResponse>(JsonOptions);
        Assert.Empty(list!.Items);

        var getResponse = await client.GetAsync($"{InvoicesEndpoint}/{id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.IgnoreQueryFilters().SingleAsync(i => i.Id == id);
        Assert.True(invoice.IsDeleted);
        Assert.NotNull(invoice.DeletedAt);
    }

    [Fact]
    public async Task Deleting_a_paid_or_cancelled_invoice_is_still_allowed()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "delete-paid@example.com");
        var id = await CreateInvoiceAsync(client, "INV-DELETE-2");
        await SetInvoiceStatusAsync(factory, id, InvoiceStatus.Paid);

        var response = await client.DeleteAsync($"{InvoicesEndpoint}/{id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Deleting_someone_elses_invoice_404s()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "delete-owner@example.com");
        var id = await CreateInvoiceAsync(ownerClient, "INV-DELETE-3");
        using var otherClient = await RegisteredClientAsync(factory, "delete-other@example.com");

        var response = await otherClient.DeleteAsync($"{InvoicesEndpoint}/{id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Deleting_without_a_session_is_unauthorized()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.DeleteAsync($"{InvoicesEndpoint}/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Deleting_writes_an_audit_log_entry()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "delete-audit@example.com");
        var id = await CreateInvoiceAsync(client, "INV-DELETE-4");

        await client.DeleteAsync($"{InvoicesEndpoint}/{id}");

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var entry = await db.AuditLogs.SingleAsync(log => log.EntityId == id && log.Action == "Invoice deleted");
        Assert.Equal("Invoice", entry.EntityType);
    }
}
