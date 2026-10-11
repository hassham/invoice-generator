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
/// Coverage for <c>/api/v1/reports/by-customer</c>, which had none.
///
/// It could not have had any: until IG-275 the query used a translated
/// <c>GroupBy(...).ToDictionaryAsync(...)</c> that PostgreSQL runs happily but EF Core's InMemory
/// provider rejects outright, so any endpoint test against it returned 500 regardless of the
/// behaviour under test. That is why IG-313's cash-basis change to this method had to be verified
/// by hand against real Postgres rather than by the suite. Grouping now happens in memory, the
/// provider difference is gone, and the behaviour is pinned here.
/// </summary>
public class RevenueByCustomerEndpointsTests
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

    private static async Task<Guid> InvoiceAsync(
        HttpClient client, string number, string customer, DateOnly issueDate, decimal amount)
    {
        var response = await client.PostAsJsonAsync("/api/v1/invoices", new InvoiceSaveRequest(
            InvoiceNumber: number,
            IssueDate: issueDate,
            DueDate: issueDate.AddDays(14),
            Reference: null,
            Currency: "AUD",
            Seller: "Northwind Trading",
            Customer: customer,
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

    private static async Task<List<RevenueByCustomerDto>> ReportAsync(HttpClient client, string query)
    {
        var response = await client.GetAsync($"/api/v1/reports/by-customer{query}");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<List<RevenueByCustomerDto>>(JsonOptions))!;
    }

    private static decimal RevenueFor(List<RevenueByCustomerDto> report, string customerName) =>
        report.SingleOrDefault(c => c.CustomerName == customerName)?.Revenue ?? -1m;

    private const string August = "?startDate=2030-08-01&endDate=2030-08-31";

    [Fact]
    public async Task Missing_session_cannot_read_revenue_by_customer()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/v1/reports/by-customer{August}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Splits_revenue_between_customers()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "bycust-split@example.com");

        var acme = await InvoiceAsync(client, "BC-ACME", "Acme Pty Ltd", new DateOnly(2030, 8, 5), 1_000);
        await PayAsync(client, acme, new DateOnly(2030, 8, 10), 1_000);
        var globex = await InvoiceAsync(client, "BC-GLOBEX", "Globex Corp", new DateOnly(2030, 8, 6), 400);
        await PayAsync(client, globex, new DateOnly(2030, 8, 11), 400);

        var report = await ReportAsync(client, August);

        Assert.Equal(1_000m, RevenueFor(report, "Acme Pty Ltd"));
        Assert.Equal(400m, RevenueFor(report, "Globex Corp"));
    }

    [Fact]
    public async Task A_customer_who_paid_nothing_is_listed_at_zero()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "bycust-zero@example.com");

        await InvoiceAsync(client, "BC-UNPAID", "Quiet Client", new DateOnly(2030, 8, 5), 2_000);

        var report = await ReportAsync(client, August);

        // Listed explicitly rather than omitted: "this customer owes you and has paid nothing" is
        // information, and dropping the row makes it look as though they are not a customer.
        Assert.Equal(0m, RevenueFor(report, "Quiet Client"));
    }

    [Fact]
    public async Task Revenue_is_attributed_to_the_month_the_payment_arrived()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "bycust-basis@example.com");

        // IG-313's cash basis, now actually pinned by a test for this endpoint. Issued September,
        // paid October: it is October revenue for this customer, and September shows zero.
        var invoiceId = await InvoiceAsync(client, "BC-CROSS", "Acme Pty Ltd", new DateOnly(2030, 9, 10), 1_000);
        await PayAsync(client, invoiceId, new DateOnly(2030, 10, 5), 1_000);

        var september = await ReportAsync(client, "?startDate=2030-09-01&endDate=2030-09-30");
        var october = await ReportAsync(client, "?startDate=2030-10-01&endDate=2030-10-31");

        Assert.Equal(0m, RevenueFor(september, "Acme Pty Ltd"));
        Assert.Equal(1_000m, RevenueFor(october, "Acme Pty Ltd"));
    }

    [Fact]
    public async Task Sums_to_the_same_total_as_the_revenue_report_over_the_same_range()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "bycust-ties-out@example.com");

        // The reason IG-313 changed both methods together. If the two reports used different
        // bases, these two totals would differ for exactly the invoices that cross a month.
        var acme = await InvoiceAsync(client, "BC-T1", "Acme Pty Ltd", new DateOnly(2030, 9, 20), 600);
        await PayAsync(client, acme, new DateOnly(2030, 10, 2), 600);
        var globex = await InvoiceAsync(client, "BC-T2", "Globex Corp", new DateOnly(2030, 10, 3), 250);
        await PayAsync(client, globex, new DateOnly(2030, 10, 4), 250);

        var byCustomer = await ReportAsync(client, "?startDate=2030-10-01&endDate=2030-10-31");

        var revenueResponse = await client.GetAsync(
            "/api/v1/reports/revenue?periodType=month&startDate=2030-10-01&endDate=2030-10-31");
        revenueResponse.EnsureSuccessStatusCode();
        var revenue = (await revenueResponse.Content.ReadFromJsonAsync<RevenueReportDto>(JsonOptions))!;

        Assert.Equal(850m, byCustomer.Sum(c => c.Revenue));
        Assert.Equal(850m, revenue.Periods.Sum(p => p.Revenue));
    }

    [Fact]
    public async Task Never_includes_another_accounts_revenue()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var owner = await RegisteredClientAsync(factory, "bycust-owner@example.com");
        var ownerInvoice = await InvoiceAsync(owner, "BC-OWNER", "Acme Pty Ltd", new DateOnly(2030, 8, 5), 500);
        await PayAsync(owner, ownerInvoice, new DateOnly(2030, 8, 10), 500);

        using var other = await RegisteredClientAsync(factory, "bycust-other@example.com");
        var otherInvoice = await InvoiceAsync(other, "BC-OTHER", "Acme Pty Ltd", new DateOnly(2030, 8, 5), 9_000);
        await PayAsync(other, otherInvoice, new DateOnly(2030, 8, 10), 9_000);

        var report = await ReportAsync(owner, August);

        // Same customer name on both accounts, which is the case that would catch a query joining
        // on name or forgetting the business scope.
        Assert.Equal(500m, RevenueFor(report, "Acme Pty Ltd"));
        Assert.Single(report);
    }

    [Fact]
    public async Task A_deleted_invoices_payment_is_excluded()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "bycust-deleted@example.com");

        var kept = await InvoiceAsync(client, "BC-KEPT", "Acme Pty Ltd", new DateOnly(2030, 8, 5), 200);
        await PayAsync(client, kept, new DateOnly(2030, 8, 10), 200);
        var removed = await InvoiceAsync(client, "BC-GONE", "Acme Pty Ltd", new DateOnly(2030, 8, 6), 800);
        await PayAsync(client, removed, new DateOnly(2030, 8, 11), 800);
        (await client.DeleteAsync($"/api/v1/invoices/{removed}")).EnsureSuccessStatusCode();

        var report = await ReportAsync(client, August);

        // Soft-deleting an invoice leaves its payment rows behind, and this query starts from
        // Payments, so the invoice join is the only thing excluding them.
        Assert.Equal(200m, RevenueFor(report, "Acme Pty Ltd"));
    }
}
