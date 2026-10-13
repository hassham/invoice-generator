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

/// <summary>IG-242 with the decision that customers are not merged across businesses: the combined
/// revenue-by-customer report lists each business's customers under that business, and totals per currency.
/// Two customers with the same name in different businesses stay two separate entries.</summary>
public class CombinedCustomerRevenueTests
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

    [Fact]
    public async Task Same_named_customers_in_two_businesses_stay_separate_under_each_business()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-customers-owner@example.com");
        var aud = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        var usd = await CreateBusinessAsync(owner, "Harbour Goods Inc", "USD");

        var audInvoice = await InvoiceAsync(owner, aud, "CC-AUD", "AUD", new DateOnly(2030, 8, 10), 1_100);
        await PayAsync(owner, aud, audInvoice, new DateOnly(2030, 8, 15), 1_100);
        var usdInvoice = await InvoiceAsync(owner, usd, "CC-USD", "USD", new DateOnly(2030, 8, 11), 400);
        await PayAsync(owner, usd, usdInvoice, new DateOnly(2030, 8, 16), 400);

        var report = await owner.GetFromJsonAsync<JsonElement>("/api/v1/reports/combined/by-customer?startDate=2030-08-01&endDate=2030-08-31", JsonOptions);

        var businesses = report.GetProperty("businesses").EnumerateArray().ToList();
        var audCustomers = businesses.Single(b => b.GetProperty("businessId").GetGuid() == aud).GetProperty("customers").EnumerateArray().ToList();
        var usdCustomers = businesses.Single(b => b.GetProperty("businessId").GetGuid() == usd).GetProperty("customers").EnumerateArray().ToList();

        // Each business has its own "Acme Pty Ltd" row, in its own currency. They are not merged.
        var audAcme = Assert.Single(audCustomers);
        var usdAcme = Assert.Single(usdCustomers);
        Assert.Equal("AUD", audAcme.GetProperty("currency").GetString());
        Assert.Equal(1_100m, audAcme.GetProperty("revenue").GetDecimal());
        Assert.Equal("USD", usdAcme.GetProperty("currency").GetString());
        Assert.Equal(400m, usdAcme.GetProperty("revenue").GetDecimal());
        Assert.NotEqual(audAcme.GetProperty("customerId").GetGuid(), usdAcme.GetProperty("customerId").GetGuid());
    }

    [Fact]
    public async Task Revenue_by_customer_totals_are_per_currency()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-customers-totals@example.com");
        var aud = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        var usd = await CreateBusinessAsync(owner, "Harbour Goods Inc", "USD");

        var audInvoice = await InvoiceAsync(owner, aud, "CT-AUD", "AUD", new DateOnly(2030, 8, 10), 1_100);
        await PayAsync(owner, aud, audInvoice, new DateOnly(2030, 8, 15), 1_100);
        var usdInvoice = await InvoiceAsync(owner, usd, "CT-USD", "USD", new DateOnly(2030, 8, 11), 400);
        await PayAsync(owner, usd, usdInvoice, new DateOnly(2030, 8, 16), 400);

        var report = await owner.GetFromJsonAsync<JsonElement>("/api/v1/reports/combined/by-customer?startDate=2030-08-01&endDate=2030-08-31", JsonOptions);

        var totals = report.GetProperty("revenueByCurrency").EnumerateArray().ToList();
        Assert.Equal(1_100m, totals.Single(t => t.GetProperty("currency").GetString() == "AUD").GetProperty("amount").GetDecimal());
        Assert.Equal(400m, totals.Single(t => t.GetProperty("currency").GetString() == "USD").GetProperty("amount").GetDecimal());
        Assert.DoesNotContain(totals, t => t.GetProperty("amount").GetDecimal() == 1_500m);
    }

    [Fact]
    public async Task Another_account_sees_none_of_these_customers()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "combined-customers-iso-owner@example.com");
        var aud = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        var invoice = await InvoiceAsync(owner, aud, "CI-AUD", "AUD", new DateOnly(2030, 8, 10), 1_000);
        await PayAsync(owner, aud, invoice, new DateOnly(2030, 8, 15), 1_000);

        using var stranger = await RegisteredClientAsync(factory, "combined-customers-iso-stranger@example.com");
        var report = await stranger.GetFromJsonAsync<JsonElement>("/api/v1/reports/combined/by-customer?startDate=2030-08-01&endDate=2030-08-31", JsonOptions);

        Assert.DoesNotContain(report.GetProperty("businesses").EnumerateArray(), b => b.GetProperty("businessId").GetGuid() == aud);
    }
}
