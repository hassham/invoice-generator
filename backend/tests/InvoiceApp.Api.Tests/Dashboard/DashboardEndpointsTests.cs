using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Dashboard;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Api.Tests.Dashboard;

/// <summary>
/// Verifies IG-60/IG-61's own AC at the real HTTP pipeline level: FSD section 109's calculation
/// rules, account/currency scoping, and the recent-invoices widget. No API exists yet to move an
/// invoice out of Draft (Epic IG-7's remaining stories) or record a payment (Epic IG-11), so
/// these tests reach directly into the DbContext to set a status/date that exercises each rule -
/// the same technique is unavoidable until those Stories exist.
/// </summary>
public class DashboardEndpointsTests
{
    private const string SummaryEndpoint = "/api/v1/dashboard/summary";
    private const string InvoicesEndpoint = "/api/v1/invoices";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static InvoiceSaveRequest ValidRequest(string invoiceNumber, string currency = "AUD", string issueDate = "2026-08-15", string dueDate = "2026-08-20") => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: DateOnly.Parse(issueDate),
        DueDate: DateOnly.Parse(dueDate),
        Reference: null,
        Currency: currency,
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

    private static async Task SetInvoiceStatusAsync(AuthenticatedRouteTestFactory factory, Guid invoiceId, InvoiceStatus status)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == invoiceId);
        invoice.Status = status;
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Missing_session_cannot_view_the_dashboard_summary()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(SummaryEndpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_all_zero_totals_and_an_empty_recent_list_for_a_fresh_account()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "dash-empty@example.com");

        var response = await client.GetAsync(SummaryEndpoint);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<DashboardSummaryDto>(JsonOptions);
        Assert.NotNull(summary);
        Assert.Equal(0, summary!.TotalInvoiced);
        Assert.Equal(0, summary.TotalPaid);
        Assert.Equal(0, summary.Outstanding);
        Assert.Equal(0, summary.Overdue);
        Assert.Equal("AUD", summary.Currency);
        Assert.Empty(summary.RecentInvoices);
    }

    [Fact]
    public async Task Excludes_draft_and_cancelled_invoices_from_total_invoiced_but_not_from_outstanding()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "dash-statuses@example.com");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var thisMonth = new DateOnly(today.Year, today.Month, Math.Min(15, DateTime.DaysInMonth(today.Year, today.Month))).ToString("yyyy-MM-dd");

        var draftResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-DRAFT", issueDate: thisMonth, dueDate: thisMonth));
        var draft = await draftResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var sentResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-SENT", issueDate: thisMonth, dueDate: thisMonth));
        var sent = await sentResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        await SetInvoiceStatusAsync(factory, sent!.Id, InvoiceStatus.Sent);

        var cancelledResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-CANCELLED", issueDate: thisMonth, dueDate: thisMonth));
        var cancelled = await cancelledResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        await SetInvoiceStatusAsync(factory, cancelled!.Id, InvoiceStatus.Cancelled);

        var response = await client.GetAsync(SummaryEndpoint);
        var summary = await response.Content.ReadFromJsonAsync<DashboardSummaryDto>(JsonOptions);

        // Only the Sent invoice (100) counts toward Total Invoiced - Draft and Cancelled excluded.
        Assert.Equal(100, summary!.TotalInvoiced);
        // Outstanding includes the Draft invoice's own Amount Due too (FSD doesn't exclude Draft
        // here) - Draft (100) + Sent (100) = 200; Cancelled is still excluded.
        Assert.Equal(200, summary.Outstanding);
        Assert.NotNull(draft);
    }

    [Fact]
    public async Task Sums_overdue_only_for_invoices_past_their_due_date_with_a_balance_owing()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "dash-overdue@example.com");

        // Due date well in the past relative to "today" in any real or test-clock scenario.
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-OVERDUE", issueDate: "2020-01-01", dueDate: "2020-01-15"));
        // Due date far in the future - not overdue.
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-FUTURE", issueDate: "2020-01-01", dueDate: "2999-01-01"));

        var response = await client.GetAsync(SummaryEndpoint);
        var summary = await response.Content.ReadFromJsonAsync<DashboardSummaryDto>(JsonOptions);

        Assert.Equal(100, summary!.Overdue);
    }

    [Fact]
    public async Task Total_invoiced_is_scoped_to_the_requested_period_by_issue_date()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "dash-period@example.com");
        var insideResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-INSIDE", issueDate: "2026-06-15", dueDate: "2026-06-20"));
        var inside = await insideResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        await SetInvoiceStatusAsync(factory, inside!.Id, InvoiceStatus.Sent);
        var outsideResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-OUTSIDE", issueDate: "2026-01-15", dueDate: "2026-01-20"));
        var outside = await outsideResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        await SetInvoiceStatusAsync(factory, outside!.Id, InvoiceStatus.Sent);

        var response = await client.GetAsync($"{SummaryEndpoint}?startDate=2026-06-01&endDate=2026-06-30");
        var summary = await response.Content.ReadFromJsonAsync<DashboardSummaryDto>(JsonOptions);

        Assert.Equal(100, summary!.TotalInvoiced); // only the June invoice
    }

    [Fact]
    public async Task Excludes_invoices_in_a_different_currency_from_the_business_default_from_the_totals()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "dash-currency@example.com");
        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
        // Registered accounts default to AUD (AccountRegistrationService) - a USD invoice should
        // not contribute to totals denominated in AUD.
        var usdResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-USD", currency: "USD", issueDate: today, dueDate: today));
        var usd = await usdResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        await SetInvoiceStatusAsync(factory, usd!.Id, InvoiceStatus.Sent);

        var response = await client.GetAsync(SummaryEndpoint);
        var summary = await response.Content.ReadFromJsonAsync<DashboardSummaryDto>(JsonOptions);

        Assert.Equal(0, summary!.TotalInvoiced);
        Assert.Equal("AUD", summary.Currency);
        // Still appears in the unscoped Recent Invoices list.
        Assert.Contains(summary.RecentInvoices, item => item.InvoiceNumber == "INV-USD");
    }

    [Fact]
    public async Task Recent_invoices_are_limited_to_5_and_ordered_newest_first()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "dash-recent@example.com");
        for (var i = 1; i <= 6; i++)
        {
            await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest($"INV-000{i}"));
        }

        var response = await client.GetAsync(SummaryEndpoint);
        var summary = await response.Content.ReadFromJsonAsync<DashboardSummaryDto>(JsonOptions);

        Assert.Equal(5, summary!.RecentInvoices.Count);
        Assert.Equal("INV-0006", summary.RecentInvoices[0].InvoiceNumber);
    }

    [Fact]
    public async Task Does_not_include_another_accounts_invoices()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "dash-owner@example.com");
        await ownerClient.PostAsJsonAsync(InvoicesEndpoint, ValidRequest("INV-0001"));

        using var otherClient = await RegisteredClientAsync(factory, "dash-other@example.com");
        var response = await otherClient.GetAsync(SummaryEndpoint);
        var summary = await response.Content.ReadFromJsonAsync<DashboardSummaryDto>(JsonOptions);

        Assert.Empty(summary!.RecentInvoices);
    }
}
