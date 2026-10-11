using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Application.Payments;
using InvoiceApp.Application.Reporting;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Domain.Payments;

namespace InvoiceApp.Api.Tests.Reporting;

/// <summary>
/// IG-268: "Periods with no invoices show zero, and figures never include another account's data."
///
/// Nothing in the suite touched <c>/api/v1/reports/revenue</c> before this. The zero-period half
/// was covered client-side only, and cross-account isolation — one business seeing another's
/// revenue — was asserted by nobody at all.
/// </summary>
public class RevenueReportEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> InvoiceAsync(HttpClient client, string number, DateOnly issueDate, decimal amount)
    {
        var response = await client.PostAsJsonAsync("/api/v1/invoices", new InvoiceSaveRequest(
            InvoiceNumber: number,
            IssueDate: issueDate,
            DueDate: issueDate.AddDays(14),
            Reference: null,
            Currency: "AUD",
            Seller: "Northwind Trading",
            Customer: "Acme Pty Ltd",
            ShipTo: null,
            Items: [new InvoiceSaveLineItem("Consulting", 1, null, amount, 0, 0)],
            InvoiceDiscountType: DiscountType.None,
            InvoiceDiscountValue: null,
            TaxCalculationMethod: TaxCalculationMethod.Exclusive,
            Notes: null,
            Terms: null,
            CustomInstructions: null,
            PaymentInstructions: null,
            TemplateId: null,
            TemplateCustomization: null));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions))!.Id;
    }

    private static async Task PayAsync(HttpClient client, Guid invoiceId, DateOnly paidOn, decimal amount)
    {
        var response = await client.PostAsJsonAsync($"/api/v1/invoices/{invoiceId}/payments",
            new PaymentRequest(paidOn, amount, PaymentMethod.BankTransfer, null, null));
        response.EnsureSuccessStatusCode();
    }

    private static async Task<RevenueReportDto> ReportAsync(HttpClient client, string query)
    {
        var response = await client.GetAsync($"/api/v1/reports/revenue{query}");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<RevenueReportDto>(JsonOptions))!;
    }

    private static decimal RevenueIn(RevenueReportDto report, string period) =>
        report.Periods.SingleOrDefault(p => p.Period == period)?.Revenue ?? -1m;

    [Fact]
    public async Task Missing_session_cannot_read_the_revenue_report()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/reports/revenue");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// The criterion that matters most: one business must never see another's revenue. Both
    /// accounts bill in the same period and the same currency, so a leak would surface as a
    /// combined figure rather than an obviously wrong one.
    /// </summary>
    [Fact]
    public async Task Never_includes_another_accounts_revenue()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var owner = await RegisteredClientAsync(factory, "rev-owner@example.com");
        var ownerInvoice = await InvoiceAsync(owner, "INV-OWNER", new DateOnly(2030, 8, 10), 500);
        await PayAsync(owner, ownerInvoice, new DateOnly(2030, 8, 20), 500);

        using var other = await RegisteredClientAsync(factory, "rev-other@example.com");
        var otherInvoice = await InvoiceAsync(other, "INV-OTHER", new DateOnly(2030, 8, 10), 9_000);
        await PayAsync(other, otherInvoice, new DateOnly(2030, 8, 20), 9_000);

        var ownerReport = await ReportAsync(owner, "?periodType=month&startDate=2030-08-01&endDate=2030-08-31");
        var otherReport = await ReportAsync(other, "?periodType=month&startDate=2030-08-01&endDate=2030-08-31");

        Assert.Equal(500m, RevenueIn(ownerReport, "2030-08"));
        Assert.Equal(9_000m, RevenueIn(otherReport, "2030-08"));
    }

    [Fact]
    public async Task A_new_account_sees_zero_not_someone_elses_figures()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var owner = await RegisteredClientAsync(factory, "rev-busy@example.com");
        var invoiceId = await InvoiceAsync(owner, "INV-BUSY", new DateOnly(2030, 8, 10), 1_234);
        await PayAsync(owner, invoiceId, new DateOnly(2030, 8, 20), 1_234);

        using var newcomer = await RegisteredClientAsync(factory, "rev-newcomer@example.com");

        var report = await ReportAsync(newcomer, "?periodType=month&startDate=2030-08-01&endDate=2030-08-31");

        Assert.All(report.Periods, period => Assert.Equal(0m, period.Revenue));
    }

    /// <summary>
    /// Every month in the range is present, including the empty ones. A gap is not the same as a
    /// zero, and a chart drawn from gaps misleads.
    /// </summary>
    [Fact]
    public async Task Reports_zero_for_a_period_with_no_invoices()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "rev-zero@example.com");
        var invoiceId = await InvoiceAsync(client, "INV-ZERO", new DateOnly(2030, 8, 10), 300);
        await PayAsync(client, invoiceId, new DateOnly(2030, 8, 20), 300);

        var report = await ReportAsync(client, "?periodType=month&startDate=2030-07-01&endDate=2030-09-30");

        Assert.Equal(["2030-07", "2030-08", "2030-09"], report.Periods.Select(p => p.Period).ToArray());
        Assert.Equal(0m, RevenueIn(report, "2030-07"));
        Assert.Equal(300m, RevenueIn(report, "2030-08"));
        Assert.Equal(0m, RevenueIn(report, "2030-09"));
    }

    [Fact]
    public async Task An_account_with_no_invoices_at_all_still_gets_its_periods()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "rev-empty@example.com");

        var report = await ReportAsync(client, "?periodType=month&startDate=2030-01-01&endDate=2030-03-31");

        Assert.Equal(3, report.Periods.Count);
        Assert.All(report.Periods, period => Assert.Equal(0m, period.Revenue));
    }

    /// <summary>Revenue is money received, so an unpaid invoice contributes nothing.</summary>
    [Fact]
    public async Task An_unpaid_invoice_is_not_revenue()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "rev-unpaid@example.com");
        await InvoiceAsync(client, "INV-UNPAID", new DateOnly(2030, 8, 10), 750);

        var report = await ReportAsync(client, "?periodType=month&startDate=2030-08-01&endDate=2030-08-31");

        Assert.Equal(0m, RevenueIn(report, "2030-08"));
    }

    [Fact]
    public async Task A_part_payment_counts_only_what_was_paid()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "rev-part@example.com");
        var invoiceId = await InvoiceAsync(client, "INV-PART", new DateOnly(2030, 8, 10), 1_000);
        await PayAsync(client, invoiceId, new DateOnly(2030, 8, 20), 400);

        var report = await ReportAsync(client, "?periodType=month&startDate=2030-08-01&endDate=2030-08-31");

        Assert.Equal(400m, RevenueIn(report, "2030-08"));
    }

    [Fact]
    public async Task Several_payments_on_one_invoice_are_summed()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "rev-multi@example.com");
        var invoiceId = await InvoiceAsync(client, "INV-MULTI", new DateOnly(2030, 8, 10), 1_000);
        await PayAsync(client, invoiceId, new DateOnly(2030, 8, 15), 300);
        await PayAsync(client, invoiceId, new DateOnly(2030, 8, 25), 250);

        var report = await ReportAsync(client, "?periodType=month&startDate=2030-08-01&endDate=2030-08-31");

        Assert.Equal(550m, RevenueIn(report, "2030-08"));
    }

    [Fact]
    public async Task A_deleted_invoices_revenue_is_excluded()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "rev-deleted@example.com");
        var kept = await InvoiceAsync(client, "INV-KEPT", new DateOnly(2030, 8, 10), 200);
        await PayAsync(client, kept, new DateOnly(2030, 8, 20), 200);
        var removed = await InvoiceAsync(client, "INV-REMOVED", new DateOnly(2030, 8, 10), 800);
        await PayAsync(client, removed, new DateOnly(2030, 8, 20), 800);

        await client.DeleteAsync($"/api/v1/invoices/{removed}");

        var report = await ReportAsync(client, "?periodType=month&startDate=2030-08-01&endDate=2030-08-31");

        Assert.Equal(200m, RevenueIn(report, "2030-08"));
    }

    [Fact]
    public async Task Groups_by_quarter()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "rev-quarter@example.com");
        var q3 = await InvoiceAsync(client, "INV-Q3", new DateOnly(2030, 8, 10), 500);
        await PayAsync(client, q3, new DateOnly(2030, 8, 20), 500);
        var q4 = await InvoiceAsync(client, "INV-Q4", new DateOnly(2030, 11, 10), 700);
        await PayAsync(client, q4, new DateOnly(2030, 11, 20), 700);

        var report = await ReportAsync(client, "?periodType=quarter&startDate=2030-07-01&endDate=2030-12-31");

        Assert.Equal(500m, RevenueIn(report, "2030-Q3"));
        Assert.Equal(700m, RevenueIn(report, "2030-Q4"));
    }

    [Fact]
    public async Task Groups_by_year()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "rev-year@example.com");
        var first = await InvoiceAsync(client, "INV-2030", new DateOnly(2030, 8, 10), 500);
        await PayAsync(client, first, new DateOnly(2030, 8, 20), 500);
        var second = await InvoiceAsync(client, "INV-2031", new DateOnly(2031, 2, 10), 700);
        await PayAsync(client, second, new DateOnly(2031, 2, 20), 700);

        var report = await ReportAsync(client, "?periodType=year&startDate=2030-01-01&endDate=2031-12-31");

        Assert.Equal(500m, RevenueIn(report, "2030"));
        Assert.Equal(700m, RevenueIn(report, "2031"));
    }

    [Theory]
    [InlineData("daily")]
    [InlineData("")]
    [InlineData("MONTHS")]
    public async Task Rejects_a_period_type_it_does_not_support(string periodType)
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, $"rev-bad-{periodType.Length}@example.com");

        var response = await client.GetAsync($"/api/v1/reports/revenue?periodType={periodType}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Reports_the_businesss_own_currency_and_period_type()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "rev-currency@example.com");

        var report = await ReportAsync(client, "?periodType=month&startDate=2030-08-01&endDate=2030-08-31");

        Assert.Equal("AUD", report.Currency);
        Assert.Equal("month", report.PeriodType);
    }
}
