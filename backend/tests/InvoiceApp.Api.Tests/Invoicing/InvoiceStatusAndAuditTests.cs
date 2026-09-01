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
/// Verifies IG-50's own AC: Overdue is computed dynamically (FSD sections 54/108) rather than a
/// value ever written to the stored Status column, and material invoice actions are audit logged
/// (FSD sections 83/107). Uses genuinely past/future dates (2020/2999) rather than a hardcoded
/// "today" so these stay correct regardless of when the suite actually runs.
/// </summary>
public class InvoiceStatusAndAuditTests
{
    private const string InvoicesEndpoint = "/api/v1/invoices";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static InvoiceSaveRequest ValidRequest(string invoiceNumber, string issueDate = "2026-08-01", string dueDate = "2026-08-01") => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: DateOnly.Parse(issueDate),
        DueDate: DateOnly.Parse(dueDate),
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

    private static async Task SetInvoiceStatusAsync(AuthenticatedRouteTestFactory factory, Guid invoiceId, InvoiceStatus status, decimal? amountDue = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == invoiceId);
        invoice.Status = status;
        if (amountDue is { } value)
        {
            invoice.AmountDue = value;
        }
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Overdue_is_computed_dynamically_in_the_list_and_detail_views()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "overdue-list-detail@example.com");
        var response = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-PASTDUE", issueDate: "2020-01-01", dueDate: "2020-01-15"));
        var created = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var listResponse = await client.GetAsync(InvoicesEndpoint);
        var list = await listResponse.Content.ReadFromJsonAsync<InvoiceListResponse>(JsonOptions);
        var detailResponse = await client.GetAsync($"{InvoicesEndpoint}/{created!.Id}");
        var detail = await detailResponse.Content.ReadFromJsonAsync<InvoiceDetailDto>(JsonOptions);

        Assert.Equal(InvoiceStatus.Overdue, list!.Items.Single().Status);
        Assert.Equal(InvoiceStatus.Overdue, detail!.Status);
    }

    [Fact]
    public async Task Cancelled_past_due_invoice_is_never_shown_as_overdue()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "overdue-cancelled@example.com");
        var response = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-CANCELLED", issueDate: "2020-01-01", dueDate: "2020-01-15"));
        var created = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        await SetInvoiceStatusAsync(factory, created!.Id, InvoiceStatus.Cancelled);

        var listResponse = await client.GetAsync(InvoicesEndpoint);
        var list = await listResponse.Content.ReadFromJsonAsync<InvoiceListResponse>(JsonOptions);

        Assert.Equal(InvoiceStatus.Cancelled, list!.Items.Single().Status);
    }

    [Fact]
    public async Task Paid_past_due_invoice_is_never_shown_as_overdue()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "overdue-paid@example.com");
        var response = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-PAID", issueDate: "2020-01-01", dueDate: "2020-01-15"));
        var created = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        await SetInvoiceStatusAsync(factory, created!.Id, InvoiceStatus.Paid, amountDue: 0);

        var listResponse = await client.GetAsync(InvoicesEndpoint);
        var list = await listResponse.Content.ReadFromJsonAsync<InvoiceListResponse>(JsonOptions);

        Assert.Equal(InvoiceStatus.Paid, list!.Items.Single().Status);
    }

    [Fact]
    public async Task Status_filter_overdue_matches_only_effectively_overdue_invoices()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "overdue-filter@example.com");
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-PASTDUE", issueDate: "2020-01-01", dueDate: "2020-01-15"));
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-NOTDUE", issueDate: "2020-01-01", dueDate: "2999-01-01"));

        var response = await client.GetAsync($"{InvoicesEndpoint}?status=Overdue");
        var result = await response.Content.ReadFromJsonAsync<InvoiceListResponse>(JsonOptions);

        Assert.Equal(["INV-PASTDUE"], result!.Items.Select(item => item.InvoiceNumber));
    }

    [Fact]
    public async Task Creating_an_invoice_writes_an_audit_log_entry()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "audit-create@example.com");

        var response = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-AUDIT-CREATE"));
        var created = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == created!.Id);
        var entry = await db.AuditLogs.SingleAsync(log => log.EntityId == created!.Id);

        Assert.Equal("Invoice", entry.EntityType);
        Assert.Equal("Invoice created", entry.Action);
        Assert.Equal(invoice.BusinessId, entry.BusinessId);
        Assert.NotNull(entry.UserId);
        // Metadata's enum fields must serialize as readable names ("Draft"), not raw ints - the
        // global JsonStringEnumConverter registered in Program.cs only applies to the ASP.NET Core
        // HTTP pipeline, not this internal JsonSerializer.Serialize call.
        Assert.Contains("Draft", entry.Metadata);
    }

    [Fact]
    public async Task Updating_an_invoice_writes_a_separate_audit_log_entry()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "audit-update@example.com");
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-AUDIT-UPDATE"));
        var created = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var updateResponse = await client.PutAsJsonAsync($"{InvoicesEndpoint}/{created!.Id}", ValidRequest("INV-AUDIT-UPDATE", issueDate: "2026-09-01", dueDate: "2026-09-15"));
        updateResponse.EnsureSuccessStatusCode();

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var entries = await db.AuditLogs.Where(log => log.EntityId == created!.Id).OrderBy(log => log.Timestamp).ToListAsync();

        Assert.Equal(2, entries.Count);
        Assert.Equal("Invoice created", entries[0].Action);
        Assert.Equal("Invoice updated", entries[1].Action);
    }
}
