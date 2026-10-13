using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Application.Payments;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Domain.Payments;

namespace InvoiceApp.Api.Tests.Reporting;

/// <summary>IG-242 (View advanced cross-business reports): the combined revenue report attributes each
/// business's figures to it, totals per currency without mixing currencies, and covers only the businesses
/// the caller can access.</summary>
public class CombinedRevenueReportTests
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
        var created = await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        return created!.Id;
    }

    private static async Task<Guid> InvoiceAsync(HttpClient client, Guid businessId, string number, string currency, DateOnly issueDate, decimal amount)
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

    private static async Task PayAsync(HttpClient client, Guid businessId, Guid invoiceId, DateOnly paidOn, decimal amount)
    {
        var response = await client.PostAsJsonAsync(
            $"/api/v1/businesses/{businessId}/invoices/{invoiceId}/payments",
            new PaymentRequest(paidOn, amount, PaymentMethod.BankTransfer, null, null));
        response.EnsureSuccessStatusCode();
    }

    private static async Task<CombinedView> CombinedAsync(HttpClient client, string query = "?periodType=month&startDate=2030-08-01&endDate=2030-08-31")
    {
        var response = await client.GetAsync($"/api/v1/reports/combined/revenue{query}");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CombinedView>(JsonOptions))!;
    }

    private sealed record CombinedView(string PeriodType, List<BusinessView> Businesses, List<CurrencyView> TotalsByCurrency);
    private sealed record BusinessView(Guid BusinessId, string BusinessName, string Currency, List<PeriodView> Periods, decimal Total);
    private sealed record PeriodView(string Period, decimal Revenue);
    private sealed record CurrencyView(string Currency, decimal Total);

    /// <summary>Owner with an AUD business (1,100 received in August) and a USD business (400 received in August).</summary>
    private static async Task<(Guid AudBusiness, Guid UsdBusiness)> SeedTwoCurrencyBusinessesAsync(HttpClient owner)
    {
        var audBusiness = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        var usdBusiness = await CreateBusinessAsync(owner, "Harbour Goods Inc", "USD");

        var aud = await InvoiceAsync(owner, audBusiness, "COMB-AUD", "AUD", new DateOnly(2030, 8, 10), 1_100);
        await PayAsync(owner, audBusiness, aud, new DateOnly(2030, 8, 20), 1_100);

        var usd = await InvoiceAsync(owner, usdBusiness, "COMB-USD", "USD", new DateOnly(2030, 8, 12), 400);
        await PayAsync(owner, usdBusiness, usd, new DateOnly(2030, 8, 22), 400);

        return (audBusiness, usdBusiness);
    }

    [Fact]
    public async Task Each_business_keeps_its_own_currency_and_figures()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-attribution@example.com");
        var (aud, usd) = await SeedTwoCurrencyBusinessesAsync(owner);

        var report = await CombinedAsync(owner);

        var audLine = report.Businesses.Single(b => b.BusinessId == aud);
        var usdLine = report.Businesses.Single(b => b.BusinessId == usd);
        Assert.Equal("AUD", audLine.Currency);
        Assert.Equal(1_100m, audLine.Total);
        Assert.Equal("USD", usdLine.Currency);
        Assert.Equal(400m, usdLine.Total);
        Assert.Equal("Harbour Goods Inc", usdLine.BusinessName);
    }

    [Fact]
    public async Task Totals_are_per_currency_and_never_add_amounts_across_currencies()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-totals@example.com");
        await SeedTwoCurrencyBusinessesAsync(owner);

        var report = await CombinedAsync(owner);

        Assert.Equal(2, report.TotalsByCurrency.Count);
        Assert.Equal(1_100m, report.TotalsByCurrency.Single(t => t.Currency == "AUD").Total);
        Assert.Equal(400m, report.TotalsByCurrency.Single(t => t.Currency == "USD").Total);
        Assert.DoesNotContain(report.TotalsByCurrency, t => t.Total == 1_500m);
    }

    [Fact]
    public async Task A_business_figure_matches_its_own_single_business_report()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-reconcile@example.com");
        var (aud, _) = await SeedTwoCurrencyBusinessesAsync(owner);

        var combined = await CombinedAsync(owner);
        var single = await owner.GetFromJsonAsync<JsonElement>(
            $"/api/v1/businesses/{aud}/reports/revenue?periodType=month&startDate=2030-08-01&endDate=2030-08-31", JsonOptions);

        var audPeriods = combined.Businesses.Single(b => b.BusinessId == aud).Periods;
        var singlePeriods = single.GetProperty("periods").EnumerateArray()
            .Select(p => (Period: p.GetProperty("period").GetString()!, Revenue: p.GetProperty("revenue").GetDecimal()))
            .ToList();
        Assert.Equal(singlePeriods, audPeriods.Select(p => (p.Period, p.Revenue)).ToList());
    }

    [Fact]
    public async Task A_member_sees_only_the_businesses_they_can_access()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-member-owner@example.com");
        var (aud, usd) = await SeedTwoCurrencyBusinessesAsync(owner);

        await owner.PostAsJsonAsync($"/api/v1/businesses/{aud}/invitations", new InviteBusinessMemberRequest("combined-member@example.com"));
        var token = Regex.Match(factory.InvoiceEmailSender.SentMessages.Last().PlainTextBody, @"/invitations/([A-Za-z0-9_\-]+)").Groups[1].Value;
        using var member = await RegisteredClientAsync(factory, "combined-member@example.com");
        (await member.PostAsync($"/api/v1/invitations/{token}/accept", null)).EnsureSuccessStatusCode();

        var report = await CombinedAsync(member);

        Assert.Contains(report.Businesses, b => b.BusinessId == aud);
        Assert.DoesNotContain(report.Businesses, b => b.BusinessId == usd);
        Assert.DoesNotContain(report.TotalsByCurrency, t => t.Currency == "USD");
    }

    [Fact]
    public async Task Another_account_sees_none_of_these_businesses()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-isolation-owner@example.com");
        var (aud, usd) = await SeedTwoCurrencyBusinessesAsync(owner);

        using var stranger = await RegisteredClientAsync(factory, "combined-isolation-stranger@example.com");
        var report = await CombinedAsync(stranger);

        Assert.DoesNotContain(report.Businesses, b => b.BusinessId == aud || b.BusinessId == usd);
        Assert.Empty(report.TotalsByCurrency.Where(t => t.Total != 0));
    }

    [Fact]
    public async Task An_unsupported_period_type_is_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-period@example.com");

        var response = await owner.GetAsync("/api/v1/reports/combined/revenue?periodType=week");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
