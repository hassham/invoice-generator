using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Application.Payments;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Domain.Payments;

namespace InvoiceApp.Api.Tests.Reporting;

/// <summary>IG-242 (View advanced cross-business reports): the combined outstanding, overdue and tax reports
/// attribute each figure to its business and total per currency, and cover only the businesses the caller can
/// access. The combined revenue report is covered by CombinedRevenueReportTests.</summary>
public class CombinedReportsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> CreateBusinessAsync(HttpClient client, string name, string currency)
    {
        var response = await client.PostAsJsonAsync("/api/v1/businesses", new CreateBusinessRequest(name, "AU", currency));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions))!.Id;
    }

    private static async Task<Guid> InvoiceAsync(HttpClient client, Guid businessId, string number, string currency, DateOnly issueDate, decimal amount, decimal taxRate = 0)
    {
        var response = await client.PostAsJsonAsync($"/api/v1/businesses/{businessId}/invoices", new InvoiceSaveRequest(
            InvoiceNumber: number,
            IssueDate: issueDate,
            DueDate: issueDate.AddDays(14),
            Reference: null,
            Currency: currency,
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

    private static async Task PayAsync(HttpClient client, Guid businessId, Guid invoiceId, DateOnly paidOn, decimal amount)
    {
        var response = await client.PostAsJsonAsync(
            $"/api/v1/businesses/{businessId}/invoices/{invoiceId}/payments",
            new PaymentRequest(paidOn, amount, PaymentMethod.BankTransfer, null, null));
        response.EnsureSuccessStatusCode();
    }

    private static async Task<JsonElement> GetJsonAsync(HttpClient client, string path)
    {
        var response = await client.GetAsync(path);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions));
    }

    private static decimal AmountFor(JsonElement totals, string currency) =>
        totals.EnumerateArray().Single(t => t.GetProperty("currency").GetString() == currency).GetProperty("amount").GetDecimal();

    [Fact]
    public async Task Outstanding_invoices_are_attributed_to_their_business_and_totalled_per_currency()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-out-owner@example.com");
        var aud = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        var usd = await CreateBusinessAsync(owner, "Harbour Goods Inc", "USD");
        await InvoiceAsync(owner, aud, "OUT-AUD", "AUD", new DateOnly(2030, 8, 10), 1_000);
        await InvoiceAsync(owner, usd, "OUT-USD", "USD", new DateOnly(2030, 8, 12), 300);

        var report = await GetJsonAsync(owner, "/api/v1/reports/combined/outstanding");

        var businesses = report.GetProperty("businesses").EnumerateArray().ToList();
        var audSection = businesses.Single(b => b.GetProperty("businessId").GetGuid() == aud);
        var usdSection = businesses.Single(b => b.GetProperty("businessId").GetGuid() == usd);
        Assert.Equal("OUT-AUD", audSection.GetProperty("invoices").EnumerateArray().Single().GetProperty("invoiceNumber").GetString());
        Assert.Equal("OUT-USD", usdSection.GetProperty("invoices").EnumerateArray().Single().GetProperty("invoiceNumber").GetString());
        Assert.Equal(1_000m, AmountFor(report.GetProperty("amountDueByCurrency"), "AUD"));
        Assert.Equal(300m, AmountFor(report.GetProperty("amountDueByCurrency"), "USD"));
    }

    [Fact]
    public async Task Overdue_invoices_appear_for_each_business_and_total_per_currency()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-overdue-owner@example.com");
        var aud = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        var usd = await CreateBusinessAsync(owner, "Harbour Goods Inc", "USD");
        // Issued and due in 2020, so overdue regardless of today's date.
        await InvoiceAsync(owner, aud, "OD-AUD", "AUD", new DateOnly(2020, 1, 1), 500);
        await InvoiceAsync(owner, usd, "OD-USD", "USD", new DateOnly(2020, 1, 2), 900);

        var report = await GetJsonAsync(owner, "/api/v1/reports/combined/overdue");

        Assert.Equal(2, report.GetProperty("businesses").EnumerateArray().Count(b => b.GetProperty("invoices").GetArrayLength() == 1));
        Assert.Equal(500m, AmountFor(report.GetProperty("amountDueByCurrency"), "AUD"));
        Assert.Equal(900m, AmountFor(report.GetProperty("amountDueByCurrency"), "USD"));
    }

    [Fact]
    public async Task Tax_is_attributed_per_business_and_totalled_per_currency_without_mixing()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-tax-owner@example.com");
        var aud = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        var usd = await CreateBusinessAsync(owner, "Harbour Goods Inc", "USD");

        // 10% tax: 1,000 -> 100 AUD of tax, 400 -> 40 USD of tax. Both paid, so both are issued taxable supplies.
        var audInvoice = await InvoiceAsync(owner, aud, "TX-AUD", "AUD", new DateOnly(2030, 8, 10), 1_000, taxRate: 10);
        await PayAsync(owner, aud, audInvoice, new DateOnly(2030, 8, 15), 1_100);
        var usdInvoice = await InvoiceAsync(owner, usd, "TX-USD", "USD", new DateOnly(2030, 8, 11), 400, taxRate: 10);
        await PayAsync(owner, usd, usdInvoice, new DateOnly(2030, 8, 16), 440);

        var report = await GetJsonAsync(owner, "/api/v1/reports/combined/tax-summary?startDate=2030-08-01&endDate=2030-08-31");

        var businesses = report.GetProperty("businesses").EnumerateArray().ToList();
        Assert.Equal(100m, businesses.Single(b => b.GetProperty("businessId").GetGuid() == aud).GetProperty("summary").GetProperty("totalTaxCollected").GetDecimal());
        Assert.Equal(40m, businesses.Single(b => b.GetProperty("businessId").GetGuid() == usd).GetProperty("summary").GetProperty("totalTaxCollected").GetDecimal());
        Assert.Equal(100m, AmountFor(report.GetProperty("taxCollectedByCurrency"), "AUD"));
        Assert.Equal(40m, AmountFor(report.GetProperty("taxCollectedByCurrency"), "USD"));
    }

    [Fact]
    public async Task A_member_sees_only_the_businesses_they_can_access_in_each_combined_report()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-scope-owner@example.com");
        var aud = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        var usd = await CreateBusinessAsync(owner, "Harbour Goods Inc", "USD");
        await InvoiceAsync(owner, aud, "SC-AUD", "AUD", new DateOnly(2030, 8, 10), 1_000);
        await InvoiceAsync(owner, usd, "SC-USD", "USD", new DateOnly(2030, 8, 12), 300);

        await owner.PostAsJsonAsync($"/api/v1/businesses/{aud}/invitations", new InviteBusinessMemberRequest("combined-scope-member@example.com"));
        var token = System.Text.RegularExpressions.Regex.Match(factory.InvoiceEmailSender.SentMessages.Last().PlainTextBody, @"/invitations/([A-Za-z0-9_\-]+)").Groups[1].Value;
        using var member = await RegisteredClientAsync(factory, "combined-scope-member@example.com");
        (await member.PostAsync($"/api/v1/invitations/{token}/accept", null)).EnsureSuccessStatusCode();

        var outstanding = await GetJsonAsync(member, "/api/v1/reports/combined/outstanding");

        var ids = outstanding.GetProperty("businesses").EnumerateArray().Select(b => b.GetProperty("businessId").GetGuid()).ToList();
        Assert.Contains(aud, ids);
        Assert.DoesNotContain(usd, ids);
        Assert.DoesNotContain(outstanding.GetProperty("amountDueByCurrency").EnumerateArray(), t => t.GetProperty("currency").GetString() == "USD");
    }

    [Fact]
    public async Task Another_account_sees_none_of_the_businesses_in_the_combined_reports()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-iso-owner@example.com");
        var aud = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        await InvoiceAsync(owner, aud, "ISO-AUD", "AUD", new DateOnly(2030, 8, 10), 1_000);

        using var stranger = await RegisteredClientAsync(factory, "combined-iso-stranger@example.com");
        var outstanding = await GetJsonAsync(stranger, "/api/v1/reports/combined/outstanding");

        Assert.DoesNotContain(outstanding.GetProperty("businesses").EnumerateArray(), b => b.GetProperty("businessId").GetGuid() == aud);
    }
}
