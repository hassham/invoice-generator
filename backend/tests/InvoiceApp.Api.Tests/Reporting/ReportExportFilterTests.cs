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

namespace InvoiceApp.Api.Tests.Reporting;

/// <summary>IG-276 (Test export correctness across filters, subtask of IG-228): exports for
/// different date ranges must produce correspondingly different, correct output. The CSV exports
/// are checked here by content; PDF parity and filenames are covered in
/// ReportPdfExportEndpointsTests.
///
/// Fixture: an August invoice (subtotal 1,000 + 10% tax = 1,100) paid in August, and a September
/// invoice (500 + 10% = 550) paid in September. Both are paid so the tax summary is not affected by
/// draft status. Every expected figure below is hand-calculated from those amounts.</summary>
public class ReportExportFilterTests
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

    private static async Task<Guid> InvoiceAsync(HttpClient client, string number, DateOnly issueDate, decimal amount, decimal taxRate = 10)
    {
        var response = await client.PostAsJsonAsync(await DefaultBusinessRoutes.InvoicesRouteAsync(client), new InvoiceSaveRequest(
            InvoiceNumber: number,
            IssueDate: issueDate,
            DueDate: issueDate.AddDays(14),
            Reference: null,
            Currency: "AUD",
            Seller: "Northwind Trading",
            Customer: "Acme Pty Ltd",
            ShipTo: null,
            Items: [new InvoiceSaveLineItem("Consulting", 1, null, amount, taxRate, 0)],
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
        var response = await client.PostAsJsonAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/invoices")}/{invoiceId}/payments",
            new PaymentRequest(paidOn, amount, PaymentMethod.BankTransfer, null, null));
        response.EnsureSuccessStatusCode();
    }

    /// <summary>Creates the August and September fixture, both paid in full.</summary>
    private static async Task SeedTwoMonthsAsync(HttpClient client)
    {
        var august = await InvoiceAsync(client, "FILTER-AUG", new DateOnly(2030, 8, 10), 1_000);
        await PayAsync(client, august, new DateOnly(2030, 8, 20), 1_100);

        var september = await InvoiceAsync(client, "FILTER-SEP", new DateOnly(2030, 9, 10), 500);
        await PayAsync(client, september, new DateOnly(2030, 9, 15), 550);
    }

    private static async Task<string> ExportAsync(HttpClient client, string path)
        => await client.GetStringAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/{path}");

    [Fact]
    public async Task Revenue_csv_for_august_only_lists_august_and_not_september()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "export-filter-revenue-aug@example.com");
        await SeedTwoMonthsAsync(client);

        var csv = await ExportAsync(client, "revenue/export/csv?periodType=month&startDate=2030-08-01&endDate=2030-08-31");

        Assert.Contains("2030-08,1100.00", csv);
        Assert.DoesNotContain("2030-09", csv);
    }

    [Fact]
    public async Task Revenue_csv_for_august_to_september_lists_both_months_with_their_own_figures()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "export-filter-revenue-both@example.com");
        await SeedTwoMonthsAsync(client);

        var csv = await ExportAsync(client, "revenue/export/csv?periodType=month&startDate=2030-08-01&endDate=2030-09-30");

        Assert.Contains("2030-08,1100.00", csv);
        Assert.Contains("2030-09,550.00", csv);
    }

    [Fact]
    public async Task Revenue_csv_differs_between_two_date_ranges_over_the_same_data()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "export-filter-revenue-differs@example.com");
        await SeedTwoMonthsAsync(client);

        var august = await ExportAsync(client, "revenue/export/csv?periodType=month&startDate=2030-08-01&endDate=2030-08-31");
        var both = await ExportAsync(client, "revenue/export/csv?periodType=month&startDate=2030-08-01&endDate=2030-09-30");

        Assert.NotEqual(august, both);
    }

    [Fact]
    public async Task Revenue_csv_for_a_range_with_no_payments_reports_no_revenue()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "export-filter-revenue-empty@example.com");
        await SeedTwoMonthsAsync(client);

        var csv = await ExportAsync(client, "revenue/export/csv?periodType=month&startDate=2030-10-01&endDate=2030-10-31");

        Assert.DoesNotContain("1100.00", csv);
        Assert.DoesNotContain("550.00", csv);
    }

    [Fact]
    public async Task Revenue_by_customer_csv_totals_follow_the_date_range()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "export-filter-customer@example.com");
        await SeedTwoMonthsAsync(client);

        var august = await ExportAsync(client, "by-customer/export/csv?startDate=2030-08-01&endDate=2030-08-31");
        var both = await ExportAsync(client, "by-customer/export/csv?startDate=2030-08-01&endDate=2030-09-30");

        Assert.Contains("Acme Pty Ltd,1100.00,AUD", august);
        Assert.Contains("Acme Pty Ltd,1650.00,AUD", both);
        Assert.NotEqual(august, both);
    }

    [Fact]
    public async Task Tax_summary_csv_collects_only_the_tax_inside_the_date_range()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "export-filter-tax@example.com");
        await SeedTwoMonthsAsync(client);

        // Tax is 100 on the August invoice and 50 on the September one.
        var august = await ExportAsync(client, "tax-summary/export/csv?startDate=2030-08-01&endDate=2030-08-31");
        var both = await ExportAsync(client, "tax-summary/export/csv?startDate=2030-08-01&endDate=2030-09-30");

        Assert.Contains("Total Tax Collected,100.00", august);
        Assert.Contains("Total Tax Collected,150.00", both);
    }
}
