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
/// IG-314: "The tax summary excludes invoices that were never issued and invoices that were
/// cancelled, and a test pins which statuses count."
///
/// <c>/api/v1/reports/tax-summary</c> had no tests of any kind before this, which is how
/// <c>GetTaxSummaryAsync</c> came to select <c>i.Status</c> and never read it - every invoice in
/// range contributed its tax, cancelled ones included. These figures get transcribed onto a BAS
/// or VAT return, so an overstatement here overstates what the user owes.
///
/// On the <c>Draft</c> half of that criterion, see <see cref="A_draft_invoice_still_counts_and_that_is_a_known_gap"/> -
/// it is not met, and cannot be met by a query change.
/// </summary>
public class TaxSummaryEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private const string Range = "?startDate=2030-08-01&endDate=2030-08-31";

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    /// <summary>A line priced at <paramref name="amount"/> with an explicit 10% rate, so the tax
    /// on each invoice is a round tenth of its subtotal and the totals are unambiguous. The
    /// account's own default tax rate is 0 (Engineering Note 45), so the rate has to be passed.</summary>
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
            Items: [new InvoiceSaveLineItem("Consulting", 1, null, amount, 10, 0)],
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

    private static async Task CancelAsync(HttpClient client, Guid invoiceId)
    {
        var response = await client.PostAsync($"/api/v1/invoices/{invoiceId}/cancel", null);
        response.EnsureSuccessStatusCode();
    }

    private static async Task PayAsync(HttpClient client, Guid invoiceId, DateOnly paidOn, decimal amount)
    {
        var response = await client.PostAsJsonAsync($"/api/v1/invoices/{invoiceId}/payments",
            new PaymentRequest(paidOn, amount, PaymentMethod.BankTransfer, null, null));
        response.EnsureSuccessStatusCode();
    }

    private static async Task<TaxSummaryDto> SummaryAsync(HttpClient client, string query = Range)
    {
        var response = await client.GetAsync($"/api/v1/reports/tax-summary{query}");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TaxSummaryDto>(JsonOptions))!;
    }

    [Fact]
    public async Task Missing_session_cannot_read_the_tax_summary()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/v1/reports/tax-summary{Range}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task An_account_with_no_invoices_reports_no_tax()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "tax-empty@example.com");

        var summary = await SummaryAsync(client);

        Assert.Equal(0m, summary.TotalTaxCollected);
        Assert.Equal(0m, summary.TotalTaxableAmount);
        Assert.Empty(summary.TaxesByRate);
    }

    [Fact]
    public async Task A_cancelled_invoices_tax_is_excluded()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "tax-cancelled@example.com");

        await InvoiceAsync(client, "TAX-KEEP", new DateOnly(2030, 8, 10), 1_000);
        var cancelled = await InvoiceAsync(client, "TAX-VOID", new DateOnly(2030, 8, 12), 2_000);
        await CancelAsync(client, cancelled);

        var summary = await SummaryAsync(client);

        // Only the surviving 1,000 invoice: 100 of tax on 1,000 taxable. Before IG-314 this
        // reported 300 on 3,000 - a voided 2,000 sale taxed as though it had happened.
        Assert.Equal(100m, summary.TotalTaxCollected);
        Assert.Equal(1_000m, summary.TotalTaxableAmount);
    }

    [Fact]
    public async Task Cancelling_the_only_invoice_leaves_no_tax_at_all()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "tax-cancelled-only@example.com");

        var cancelled = await InvoiceAsync(client, "TAX-VOID-ONLY", new DateOnly(2030, 8, 10), 5_000);
        await CancelAsync(client, cancelled);

        var summary = await SummaryAsync(client);

        Assert.Equal(0m, summary.TotalTaxCollected);
        Assert.Equal(0m, summary.TotalTaxableAmount);
        Assert.Empty(summary.TaxesByRate);
    }

    [Fact]
    public async Task A_part_paid_invoice_cancelled_afterwards_is_also_excluded()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "tax-cancelled-partpaid@example.com");

        // A paid invoice cannot be cancelled, but a partially paid one can, so this is the only
        // route to a Cancelled invoice that has real money against it. Its tax still goes, because
        // the supply was voided; the money that did arrive is reported by the revenue report
        // instead, which is cash basis and deliberately keeps it (docs/FSD.md section 142).
        var invoiceId = await InvoiceAsync(client, "TAX-VOID-PART", new DateOnly(2030, 8, 10), 1_000);
        await PayAsync(client, invoiceId, new DateOnly(2030, 8, 15), 400);
        await CancelAsync(client, invoiceId);

        var summary = await SummaryAsync(client);

        Assert.Equal(0m, summary.TotalTaxCollected);
    }

    [Fact]
    public async Task An_unpaid_invoice_still_charged_tax_so_it_counts()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "tax-unpaid@example.com");

        await InvoiceAsync(client, "TAX-UNPAID", new DateOnly(2030, 8, 10), 1_000);

        var summary = await SummaryAsync(client);

        // The tax summary is accrual: tax is charged when the invoice is raised, not when the
        // customer gets round to paying. Contrast the revenue report, which reports 0 here.
        Assert.Equal(100m, summary.TotalTaxCollected);
    }

    [Fact]
    public async Task A_paid_invoices_tax_counts_once_not_twice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "tax-paid@example.com");

        var invoiceId = await InvoiceAsync(client, "TAX-PAID", new DateOnly(2030, 8, 10), 1_000);
        await PayAsync(client, invoiceId, new DateOnly(2030, 8, 15), 600);
        await PayAsync(client, invoiceId, new DateOnly(2030, 8, 20), 500);

        var summary = await SummaryAsync(client);

        // Two payments against one invoice. Tax follows the invoice, not the payments, so it is
        // 100 - not 100 per payment and not scaled by how much has been paid.
        Assert.Equal(100m, summary.TotalTaxCollected);
        Assert.Equal(1_000m, summary.TotalTaxableAmount);
    }

    [Fact]
    public async Task A_draft_invoice_still_counts_and_that_is_a_known_gap()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "tax-draft@example.com");

        await InvoiceAsync(client, "TAX-DRAFT", new DateOnly(2030, 8, 10), 1_000);

        var summary = await SummaryAsync(client);

        // This pins current behaviour rather than desired behaviour, and IG-314's criterion is
        // only half met because of it. A never-issued invoice is not a taxable supply - but
        // nothing in this codebase assigns InvoiceStatus.Sent or Viewed and Invoice has no SentAt
        // column, so an invoice emailed to a customer is stored at Draft exactly like one
        // abandoned half-written. Excluding Draft would drop real taxable supplies and
        // UNDER-report tax, which is the worse error. Change this test only together with a
        // stored "issued" signal.
        Assert.Equal(100m, summary.TotalTaxCollected);
    }

    [Fact]
    public async Task An_invoice_outside_the_range_is_excluded()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "tax-range@example.com");

        await InvoiceAsync(client, "TAX-IN", new DateOnly(2030, 8, 10), 1_000);
        await InvoiceAsync(client, "TAX-OUT", new DateOnly(2030, 9, 10), 7_000);

        var summary = await SummaryAsync(client);

        Assert.Equal(100m, summary.TotalTaxCollected);
    }

    [Fact]
    public async Task Never_includes_another_accounts_tax()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var owner = await RegisteredClientAsync(factory, "tax-owner@example.com");
        await InvoiceAsync(owner, "TAX-OWNER", new DateOnly(2030, 8, 10), 1_000);

        using var other = await RegisteredClientAsync(factory, "tax-other@example.com");
        await InvoiceAsync(other, "TAX-OTHER", new DateOnly(2030, 8, 10), 90_000);

        var summary = await SummaryAsync(owner);

        Assert.Equal(100m, summary.TotalTaxCollected);
        Assert.Equal(1_000m, summary.TotalTaxableAmount);
    }

    [Fact]
    public async Task A_deleted_invoices_tax_is_excluded()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "tax-deleted@example.com");

        await InvoiceAsync(client, "TAX-D-KEEP", new DateOnly(2030, 8, 10), 1_000);
        var removed = await InvoiceAsync(client, "TAX-D-GONE", new DateOnly(2030, 8, 11), 4_000);
        (await client.DeleteAsync($"/api/v1/invoices/{removed}")).EnsureSuccessStatusCode();

        var summary = await SummaryAsync(client);

        Assert.Equal(100m, summary.TotalTaxCollected);
    }

    [Fact]
    public async Task Reports_the_businesss_own_currency()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "tax-currency@example.com");

        var summary = await SummaryAsync(client);

        Assert.Equal("AUD", summary.Currency);
    }
}
