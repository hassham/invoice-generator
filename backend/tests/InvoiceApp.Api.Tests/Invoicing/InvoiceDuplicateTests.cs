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

/// <summary>Verifies IG-48's own AC and FSD section 51: copied/not-copied fields, a new
/// independent identifier, and that editing the duplicate never touches the source.</summary>
public class InvoiceDuplicateTests
{
    private const string InvoicesEndpoint = "/api/v1/invoices";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static InvoiceSaveRequest ValidRequest(string invoiceNumber, string issueDate = "2030-01-01", string dueDate = "2030-01-16") => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: DateOnly.Parse(issueDate),
        DueDate: DateOnly.Parse(dueDate),
        Reference: "PO-42",
        Currency: "AUD",
        Seller: "My Business",
        Customer: "Acme Pty Ltd\n123 Main St",
        ShipTo: "456 Warehouse Rd",
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

    private static async Task<InvoiceDetailDto> GetDetailAsync(HttpClient client, Guid id)
    {
        var response = await client.GetAsync($"{InvoicesEndpoint}/{id}");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<InvoiceDetailDto>(JsonOptions))!;
    }

    [Fact]
    public async Task Duplicating_copies_customer_items_tax_settings_notes_terms_and_template()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "duplicate-copy@example.com");
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-SRC-1"));
        var source = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var response = await client.PostAsync($"{InvoicesEndpoint}/{source!.Id}/duplicate", null);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var duplicate = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        var duplicateDetail = await GetDetailAsync(client, duplicate!.Id);
        var sourceDetail = await GetDetailAsync(client, source.Id);

        Assert.Equal(sourceDetail.Customer, duplicateDetail.Customer);
        Assert.Equal(sourceDetail.ShipTo, duplicateDetail.ShipTo);
        Assert.Equal(sourceDetail.Notes, duplicateDetail.Notes);
        Assert.Equal(sourceDetail.Terms, duplicateDetail.Terms);
        Assert.Equal(sourceDetail.InvoiceDiscountType, duplicateDetail.InvoiceDiscountType);
        Assert.Equal(sourceDetail.InvoiceDiscountValue, duplicateDetail.InvoiceDiscountValue);
        Assert.Equal(sourceDetail.TotalAmount, duplicateDetail.TotalAmount);
        Assert.Single(duplicateDetail.Items);
        Assert.Equal(sourceDetail.Items[0].Description, duplicateDetail.Items[0].Description);
        Assert.Equal(sourceDetail.Items[0].UnitPrice, duplicateDetail.Items[0].UnitPrice);
    }

    [Fact]
    public async Task Duplicating_does_not_copy_invoice_number_reference_payments_or_status()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "duplicate-not-copy@example.com");
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-SRC-2"));
        var source = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var response = await client.PostAsync($"{InvoicesEndpoint}/{source!.Id}/duplicate", null);
        var duplicate = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        var duplicateDetail = await GetDetailAsync(client, duplicate!.Id);

        Assert.NotEqual(source.InvoiceNumber, duplicate.InvoiceNumber);
        Assert.Equal("INV-SRC-2-COPY", duplicate.InvoiceNumber);
        Assert.Null(duplicateDetail.Reference);
        Assert.Equal(InvoiceStatus.Draft, duplicate.Status);
        Assert.Equal(0, duplicate.AmountPaid);
        Assert.Equal(duplicate.TotalAmount, duplicate.AmountDue);
    }

    [Fact]
    public async Task Duplicating_sets_issue_date_to_today_and_preserves_the_source_payment_term_length()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "duplicate-dates@example.com");
        // 15-day term (Jan 1 -> Jan 16).
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-SRC-3", issueDate: "2030-01-01", dueDate: "2030-01-16"));
        var source = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var response = await client.PostAsync($"{InvoicesEndpoint}/{source!.Id}/duplicate", null);
        var duplicate = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        Assert.Equal(DateOnly.FromDateTime(DateTime.UtcNow), duplicate!.IssueDate);
        Assert.Equal(15, duplicate.DueDate.DayNumber - duplicate.IssueDate.DayNumber);
    }

    [Fact]
    public async Task Duplicating_twice_generates_distinct_independent_numbers()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "duplicate-twice@example.com");
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-SRC-4"));
        var source = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var first = await (await client.PostAsync($"{InvoicesEndpoint}/{source!.Id}/duplicate", null)).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        var second = await (await client.PostAsync($"{InvoicesEndpoint}/{source.Id}/duplicate", null)).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        Assert.Equal("INV-SRC-4-COPY", first!.InvoiceNumber);
        Assert.Equal("INV-SRC-4-COPY-2", second!.InvoiceNumber);
        Assert.NotEqual(first.Id, second.Id);
    }

    [Fact]
    public async Task Editing_the_duplicate_does_not_alter_the_source()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "duplicate-independent@example.com");
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-SRC-5"));
        var source = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        var duplicate = await (await client.PostAsync($"{InvoicesEndpoint}/{source!.Id}/duplicate", null)).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var updateRequest = ValidRequest(duplicate!.InvoiceNumber) with { Notes = "Edited only on the duplicate" };
        await client.PutAsJsonAsync($"{InvoicesEndpoint}/{duplicate.Id}", updateRequest);

        var sourceDetail = await GetDetailAsync(client, source.Id);
        Assert.Equal("Thanks for your business", sourceDetail.Notes);
    }

    [Fact]
    public async Task Duplicating_writes_an_audit_log_entry()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "duplicate-audit@example.com");
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-SRC-6"));
        var source = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        var duplicate = await (await client.PostAsync($"{InvoicesEndpoint}/{source!.Id}/duplicate", null)).Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var entry = await db.AuditLogs.SingleAsync(log => log.EntityId == duplicate!.Id && log.Action == "Invoice duplicated");
        Assert.Equal("Invoice", entry.EntityType);
        Assert.Contains(source.InvoiceNumber, entry.Metadata);
    }

    [Fact]
    public async Task Duplicating_someone_elses_invoice_404s()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "duplicate-owner@example.com");
        var createResponse = await ownerClient.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-SRC-7"));
        var source = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        using var otherClient = await RegisteredClientAsync(factory, "duplicate-other@example.com");

        var response = await otherClient.PostAsync($"{InvoicesEndpoint}/{source!.Id}/duplicate", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Duplicating_without_a_session_is_unauthorized()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.PostAsync($"{InvoicesEndpoint}/{Guid.NewGuid()}/duplicate", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
