using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Customers;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Api.Tests.Businesses;

/// <summary>
/// IG-296 (phase 1): invoices and customers live under a business. Data created under one business
/// must not appear under another business of the same account, and another account's business id
/// must be reported as not found.
/// </summary>
public class BusinessScopedInvoicesAndCustomersTests
{
    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> DefaultBusinessIdAsync(HttpClient client) =>
        await DefaultBusinessRoutes.DefaultBusinessIdAsync(client);

    private static async Task<Guid> CreateBusinessAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/v1/businesses", new CreateBusinessRequest(name, "AU", "AUD"));
        response.EnsureSuccessStatusCode();
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        return body.RootElement.GetProperty("id").GetGuid();
    }

    private static InvoiceSaveRequest InvoiceRequest(string invoiceNumber) => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: new DateOnly(2030, 1, 1),
        DueDate: new DateOnly(2030, 1, 15),
        Reference: null,
        Currency: "AUD",
        Seller: "Seller",
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

    private static CustomerRequest ValidCustomer(string name) => new(
        name, null, "billing@acme.example", null, null, null, null, null, null, null, null, null);

    private static async Task<int> InvoiceCountAsync(HttpClient client, Guid businessId)
    {
        var response = await client.GetAsync($"/api/v1/businesses/{businessId}/invoices");
        response.EnsureSuccessStatusCode();
        var list = await response.Content.ReadFromJsonAsync<InvoiceListResponse>(new JsonSerializerOptions(JsonSerializerDefaults.Web) { Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() } });
        return list!.Items.Count;
    }

    [Fact]
    public async Task An_invoice_created_under_a_business_is_listed_only_under_that_business()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "scope-invoices@example.com");
        var defaultBusinessId = await DefaultBusinessIdAsync(client);
        var secondBusinessId = await CreateBusinessAsync(client, "Second Co");

        var create = await client.PostAsJsonAsync($"/api/v1/businesses/{secondBusinessId}/invoices", InvoiceRequest("INV-S-0001"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        Assert.Equal(1, await InvoiceCountAsync(client, secondBusinessId));
        Assert.Equal(0, await InvoiceCountAsync(client, defaultBusinessId));
    }

    [Fact]
    public async Task An_invoice_is_not_reachable_through_a_different_business_of_the_same_account()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "scope-invoice-by-id@example.com");
        var defaultBusinessId = await DefaultBusinessIdAsync(client);
        var secondBusinessId = await CreateBusinessAsync(client, "Second Co");
        var create = await client.PostAsJsonAsync($"/api/v1/businesses/{secondBusinessId}/invoices", InvoiceRequest("INV-S-0002"));
        var created = await create.Content.ReadFromJsonAsync<InvoiceDto>(new JsonSerializerOptions(JsonSerializerDefaults.Web) { Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() } });

        var response = await client.GetAsync($"/api/v1/businesses/{defaultBusinessId}/invoices/{created!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task A_customer_created_under_a_business_is_listed_only_under_that_business()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "scope-customers@example.com");
        var defaultBusinessId = await DefaultBusinessIdAsync(client);
        var secondBusinessId = await CreateBusinessAsync(client, "Second Co");

        var create = await client.PostAsJsonAsync($"/api/v1/businesses/{secondBusinessId}/customers", ValidCustomer("Only In Second"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var secondList = await (await client.GetAsync($"/api/v1/businesses/{secondBusinessId}/customers")).Content.ReadFromJsonAsync<List<CustomerDto>>();
        var defaultList = await (await client.GetAsync($"/api/v1/businesses/{defaultBusinessId}/customers")).Content.ReadFromJsonAsync<List<CustomerDto>>();
        Assert.Single(secondList!);
        Assert.Empty(defaultList!);
    }

    [Fact]
    public async Task Another_accounts_business_is_not_found_for_invoices_or_customers()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "scope-owner@example.com");
        using var intruder = await RegisteredClientAsync(factory, "scope-intruder@example.com");
        var ownersBusinessId = await DefaultBusinessIdAsync(owner);

        var invoiceList = await intruder.GetAsync($"/api/v1/businesses/{ownersBusinessId}/invoices");
        var invoiceCreate = await intruder.PostAsJsonAsync($"/api/v1/businesses/{ownersBusinessId}/invoices", InvoiceRequest("INV-X-0001"));
        var customerList = await intruder.GetAsync($"/api/v1/businesses/{ownersBusinessId}/customers");
        var customerCreate = await intruder.PostAsJsonAsync($"/api/v1/businesses/{ownersBusinessId}/customers", ValidCustomer("Intruder"));

        Assert.Equal(HttpStatusCode.NotFound, invoiceList.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, invoiceCreate.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, customerList.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, customerCreate.StatusCode);
    }
}
