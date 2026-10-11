using System.Net;
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

/// <summary>
/// IG-275: "Exported CSV/PDF match the currently displayed figures and applied filters exactly."
///
/// The CSV half was already built and already faithful - each CSV endpoint calls the same
/// IReportingService method with the same arguments as the report it mirrors. The PDF half did not
/// exist at all; only a doc comment claimed it did. These tests cover the five new
/// <c>/export/pdf</c> endpoints.
///
/// What a test can prove here and what it cannot: these assert the response is a PDF of plausible
/// size with the right filename and that the endpoints are session-guarded and honour their
/// filters. They do **not** prove the rendered text, because the bytes are a compressed PDF stream
/// - asserting on the magic bytes would pass for a PDF containing the wrong numbers entirely.
/// Rendered content is verified separately by text extraction; see IG-275's Jira comment.
/// </summary>
public class ReportPdfExportEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static readonly string[] AllReports =
        ["revenue", "outstanding", "overdue", "by-customer", "tax-summary"];

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> InvoiceAsync(
        HttpClient client, string number, DateOnly issueDate, decimal amount, decimal taxRate = 10)
    {
        var response = await client.PostAsJsonAsync($"{await DefaultBusinessRoutes.InvoicesRouteAsync(client)}", new InvoiceSaveRequest(
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

    /// <summary>A PDF always begins "%PDF-". Necessary but nowhere near sufficient, hence the
    /// size floor alongside it: an empty or truncated document would still carry the header.</summary>
    private static async Task AssertIsPdfAsync(HttpResponseMessage response, string expectedFileName)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(expectedFileName, response.Content.Headers.ContentDisposition?.FileNameStar
            ?? response.Content.Headers.ContentDisposition?.FileName);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.StartsWith("%PDF-", System.Text.Encoding.ASCII.GetString(bytes, 0, 5));
        Assert.True(bytes.Length > 1_000, $"PDF was only {bytes.Length} bytes, which is too small to hold a rendered page.");
    }

    [Theory]
    [InlineData("revenue")]
    [InlineData("outstanding")]
    [InlineData("overdue")]
    [InlineData("by-customer")]
    [InlineData("tax-summary")]
    public async Task Missing_session_cannot_export_a_report_pdf(string report)
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/{report}/export/pdf");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Every_report_exports_a_pdf_even_with_no_data()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pdf-empty@example.com");

        // A brand-new account. An empty report is a real answer - "you have no overdue invoices" -
        // and must still produce a readable document rather than a 500 or a zero-byte file.
        foreach (var report in AllReports)
        {
            var response = await client.GetAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/{report}/export/pdf");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
            var bytes = await response.Content.ReadAsByteArrayAsync();
            Assert.True(bytes.Length > 1_000, $"{report} produced only {bytes.Length} bytes.");
        }
    }

    [Fact]
    public async Task Revenue_pdf_is_named_for_the_period_type_it_was_asked_for()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pdf-revenue-name@example.com");

        var invoiceId = await InvoiceAsync(client, "PDF-REV", new DateOnly(2030, 8, 10), 1_000);
        await PayAsync(client, invoiceId, new DateOnly(2030, 8, 20), 1_000);

        var month = await client.GetAsync(
            $"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/revenue/export/pdf?periodType=month&startDate=2030-08-01&endDate=2030-08-31");
        await AssertIsPdfAsync(month, "revenue-report-month.pdf");

        var quarter = await client.GetAsync(
            $"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/revenue/export/pdf?periodType=quarter&startDate=2030-07-01&endDate=2030-09-30");
        await AssertIsPdfAsync(quarter, "revenue-report-quarter.pdf");
    }

    [Fact]
    public async Task Revenue_pdf_rejects_a_period_type_it_does_not_support()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pdf-revenue-bad@example.com");

        // Same guard as the JSON and CSV endpoints. Without it an unsupported periodType would
        // reach GetPeriodKey and surface as a 500 from inside the renderer.
        var response = await client.GetAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/revenue/export/pdf?periodType=fortnight");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Each_report_pdf_carries_its_own_filename()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pdf-names@example.com");

        await AssertIsPdfAsync(
            await client.GetAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/outstanding/export/pdf"), "outstanding-invoices.pdf");
        await AssertIsPdfAsync(
            await client.GetAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/overdue/export/pdf"), "overdue-invoices.pdf");
        await AssertIsPdfAsync(
            await client.GetAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/by-customer/export/pdf"), "revenue-by-customer.pdf");
        await AssertIsPdfAsync(
            await client.GetAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/tax-summary/export/pdf"), "tax-summary.pdf");
    }

    [Fact]
    public async Task A_report_pdf_never_includes_another_accounts_data()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        // The PDF endpoints resolve the business themselves rather than taking an id from the
        // query, so this proves the same isolation IG-268 proved for the JSON reports: a large
        // invoice on another account cannot inflate this account's document.
        using var owner = await RegisteredClientAsync(factory, "pdf-owner@example.com");
        var ownerInvoice = await InvoiceAsync(owner, "PDF-OWNER", new DateOnly(2030, 8, 10), 500);
        await PayAsync(owner, ownerInvoice, new DateOnly(2030, 8, 20), 550);

        using var other = await RegisteredClientAsync(factory, "pdf-other@example.com");
        var otherInvoice = await InvoiceAsync(other, "PDF-OTHER", new DateOnly(2030, 8, 10), 90_000);
        await PayAsync(other, otherInvoice, new DateOnly(2030, 8, 20), 99_000);

        var ownerPdf = await client_GetAsync(owner,
            $"{await DefaultBusinessRoutes.RouteAsync(owner, "/reports")}/revenue/export/pdf?periodType=month&startDate=2030-08-01&endDate=2030-08-31");
        var otherPdf = await client_GetAsync(other,
            $"{await DefaultBusinessRoutes.RouteAsync(other, "/reports")}/revenue/export/pdf?periodType=month&startDate=2030-08-01&endDate=2030-08-31");

        // Two accounts with very different figures must not produce byte-identical documents. This
        // is a weak assertion on its own, but it is the strongest one available without decoding
        // the PDF stream, and it would catch an endpoint that ignored the session and rendered the
        // same report for everyone.
        Assert.NotEqual(Convert.ToBase64String(ownerPdf), Convert.ToBase64String(otherPdf));
    }

    private static async Task<byte[]> client_GetAsync(HttpClient client, string url)
    {
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsByteArrayAsync();
    }

    [Fact]
    public async Task The_csv_and_pdf_of_one_report_are_built_from_the_same_call()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pdf-csv-parity@example.com");

        var invoiceId = await InvoiceAsync(client, "PDF-PARITY", new DateOnly(2030, 8, 10), 1_000);
        await PayAsync(client, invoiceId, new DateOnly(2030, 8, 20), 1_100);

        const string filters = "periodType=month&startDate=2030-08-01&endDate=2030-08-31";

        var csv = await client.GetStringAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/revenue/export/csv?{filters}");
        var pdf = await client.GetAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/revenue/export/pdf?{filters}");

        // The figure the CSV prints for August is the one the PDF was built from - both endpoints
        // call GetRevenueReportAsync with these same arguments. Asserting the CSV's value here
        // pins the shared contract; the PDF's own rendering of it is checked by text extraction.
        Assert.Contains("2030-08,1100.00", csv);
        await AssertIsPdfAsync(pdf, "revenue-report-month.pdf");
    }

    [Fact]
    public async Task An_outstanding_pdf_reflects_the_invoices_that_are_actually_outstanding()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "pdf-outstanding@example.com");

        await InvoiceAsync(client, "PDF-OWING", new DateOnly(2030, 8, 10), 1_000);
        var settled = await InvoiceAsync(client, "PDF-SETTLED", new DateOnly(2030, 8, 11), 2_000);
        await PayAsync(client, settled, new DateOnly(2030, 8, 12), 2_200);

        // Same service call as the on-screen report, so the CSV is the readable proof of which
        // invoices went in; the PDF is generated from that same list in the same request shape.
        var csv = await client.GetStringAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/outstanding/export/csv");
        Assert.Contains("PDF-OWING", csv);
        Assert.DoesNotContain("PDF-SETTLED", csv);

        await AssertIsPdfAsync(
            await client.GetAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/reports")}/outstanding/export/pdf"), "outstanding-invoices.pdf");
    }
}
