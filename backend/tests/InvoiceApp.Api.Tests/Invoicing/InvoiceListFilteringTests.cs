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
/// Verifies IG-63's own AC: search (FSD section 46), filters (section 47), and sorting (section
/// 48) on GET /api/v1/invoices, all combining with AND and staying account-scoped. No API exists
/// yet to move an invoice out of Draft (Epic IG-7's remaining Stories), so status-filter tests
/// reach directly into the DbContext to set it - the same technique DashboardEndpointsTests.cs
/// already established as unavoidable until those Stories land.
/// </summary>
public class InvoiceListFilteringTests
{
    private const string InvoicesEndpoint = "/api/v1/invoices";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    // issueDate/dueDate default safely into the future (IG-50 made Overdue a computed, not
    // stored, status) - a due date that quietly falls into the past as real time passes would
    // otherwise flip these fixtures' invoices from Draft/Sent to Overdue out from under the
    // status-filter tests below, which don't intend to exercise Overdue at all.
    private static InvoiceSaveRequest ValidRequest(string invoiceNumber, string customer = "Acme Pty Ltd", string? reference = null, decimal unitPrice = 100, string issueDate = "2030-08-01") => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: DateOnly.Parse(issueDate),
        DueDate: DateOnly.Parse(issueDate),
        Reference: reference,
        Currency: "AUD",
        Seller: "My Business",
        Customer: customer,
        ShipTo: null,
        Items: [new InvoiceSaveLineItem("Consulting", 1, null, unitPrice, 0, 0)],
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

    private static async Task SetInvoiceStatusAsync(AuthenticatedRouteTestFactory factory, Guid invoiceId, InvoiceStatus status)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == invoiceId);
        invoice.Status = status;
        await db.SaveChangesAsync();
    }

    private static async Task<List<string>> InvoiceNumbersAsync(HttpClient client, string queryString)
    {
        var response = await client.GetAsync($"{InvoicesEndpoint}{queryString}");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<InvoiceListResponse>(JsonOptions);
        return result!.Items.Select(item => item.InvoiceNumber).ToList();
    }

    [Fact]
    public async Task Search_matches_invoice_number_reference_and_customer_fields()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "search-fields@example.com");
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-ZEBRA", customer: "Random Co"));
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-0002", customer: "Random Co", reference: "ZEBRA-PO"));
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-0003", customer: "Zebra Holdings Pty Ltd"));
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-0004", customer: "Not Matching At All"));

        var byNumber = await InvoiceNumbersAsync(client, "?search=zebra");

        Assert.Equal(3, byNumber.Count);
        Assert.Contains("INV-ZEBRA", byNumber);
        Assert.Contains("INV-0002", byNumber);
        Assert.Contains("INV-0003", byNumber);
        Assert.DoesNotContain("INV-0004", byNumber);
    }

    [Fact]
    public async Task Search_matches_customer_email_case_insensitively()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "search-email@example.com");
        var response = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-0001", customer: "Some Business\nbilling@zephyr.example"));

        // The find-or-create customer text is a multi-line block; email isn't part of it (IG-45's
        // free-text mapping has no email field), so set it directly via the customer record to
        // prove search reads the linked Customer.Email, not just re-parsing the invoice's own text.
        var created = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var customer = await db.Customers.SingleAsync(c => c.Id == created!.CustomerId);
            customer.Email = "hello@zephyr.example";
            await db.SaveChangesAsync();
        }

        var matches = await InvoiceNumbersAsync(client, "?search=ZEPHYR");

        Assert.Single(matches);
    }

    [Fact]
    public async Task Filters_by_status()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "filter-status@example.com");
        var draftResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-DRAFT"));
        var sentResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-SENT"));
        var sent = await sentResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        await SetInvoiceStatusAsync(factory, sent!.Id, InvoiceStatus.Sent);
        Assert.NotNull(await draftResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions));

        var draftOnly = await InvoiceNumbersAsync(client, "?status=Draft");
        var sentOnly = await InvoiceNumbersAsync(client, "?status=Sent");

        Assert.Equal(["INV-DRAFT"], draftOnly);
        Assert.Equal(["INV-SENT"], sentOnly);
    }

    [Fact]
    public async Task Filters_by_customer_id()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "filter-customer@example.com");
        var aResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-A", customer: "Customer A"));
        var a = await aResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-B", customer: "Customer B"));

        var filtered = await InvoiceNumbersAsync(client, $"?customerId={a!.CustomerId}");

        Assert.Equal(["INV-A"], filtered);
    }

    [Fact]
    public async Task Filters_by_issue_date_range()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "filter-date@example.com");
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-JUNE", issueDate: "2026-06-15"));
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-JAN", issueDate: "2026-01-15"));

        var juneOnly = await InvoiceNumbersAsync(client, "?startDate=2026-06-01&endDate=2026-06-30");

        Assert.Equal(["INV-JUNE"], juneOnly);
    }

    [Fact]
    public async Task Combines_multiple_criteria_with_and()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "filter-combined@example.com");
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-MATCH", customer: "Zephyr Co", issueDate: "2026-06-15"));
        // Same customer name text but outside the date range - AND semantics must exclude it.
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-WRONG-DATE", customer: "Zephyr Co", issueDate: "2026-01-15"));

        var matches = await InvoiceNumbersAsync(client, "?search=Zephyr&startDate=2026-06-01&endDate=2026-06-30");

        Assert.Equal(["INV-MATCH"], matches);
    }

    [Fact]
    public async Task Sorts_by_amount_and_by_due_date()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "sort@example.com");
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-LOW", unitPrice: 50));
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-HIGH", unitPrice: 500));

        var highestFirst = await InvoiceNumbersAsync(client, "?sort=AmountHighest");
        var lowestFirst = await InvoiceNumbersAsync(client, "?sort=AmountLowest");

        Assert.Equal(["INV-HIGH", "INV-LOW"], highestFirst);
        Assert.Equal(["INV-LOW", "INV-HIGH"], lowestFirst);
    }

    [Fact]
    public async Task Sorts_oldest_first_when_requested()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "sort-oldest@example.com");
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-FIRST"));
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-SECOND"));

        var newestFirst = await InvoiceNumbersAsync(client, "");
        var oldestFirst = await InvoiceNumbersAsync(client, "?sort=Oldest");

        Assert.Equal(["INV-SECOND", "INV-FIRST"], newestFirst);
        Assert.Equal(["INV-FIRST", "INV-SECOND"], oldestFirst);
    }

    [Fact]
    public async Task No_criteria_returns_todays_original_unfiltered_newest_first_behavior()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "no-criteria@example.com");
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-0001"));
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-0002"));

        var response = await client.GetAsync(InvoicesEndpoint);
        var result = await response.Content.ReadFromJsonAsync<InvoiceListResponse>(JsonOptions);

        Assert.Equal(2, result!.TotalCount);
        Assert.Equal("INV-0002", result.Items[0].InvoiceNumber);
    }
}
