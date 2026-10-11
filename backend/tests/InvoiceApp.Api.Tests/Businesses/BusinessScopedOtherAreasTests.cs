using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Catalog;
using InvoiceApp.Application.Estimates;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Estimates;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Api.Tests.Businesses;

/// <summary>
/// IG-296 (phase 2): catalog items, estimates, documents, reports and the dashboard, plus the
/// Stripe connect entry point, are all scoped to a business. Data created under one business must
/// not appear under another business of the same account, and another account's business id must
/// be reported as not found.
/// </summary>
public class BusinessScopedOtherAreasTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        // No auto-redirect: the Stripe connect route answers with a redirect to Stripe, which must be seen, not followed.
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
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

    /// <summary>The number of entries in a list response's "items" array (or the array itself, for
    /// the report endpoints that return a bare list).</summary>
    private static async Task<int> ItemCountAsync(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        var root = body.RootElement;
        return root.ValueKind == JsonValueKind.Array
            ? root.GetArrayLength()
            : root.GetProperty("items").GetArrayLength();
    }

    private static CatalogItemRequest ValidItem(string name) => new(name, null, null, null, 150m, 10m);

    private static InvoiceSaveRequest ValidInvoice(string invoiceNumber) => new(
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

    private static EstimateSaveRequest ValidEstimate(string estimateNumber) => new(
        EstimateNumber: estimateNumber,
        IssueDate: new DateOnly(2030, 8, 1),
        ExpiryDate: new DateOnly(2030, 8, 15),
        Reference: null,
        Currency: "AUD",
        Seller: "Seller",
        Customer: "Acme Pty Ltd",
        ShipTo: null,
        Items: [new EstimateSaveLineItem("Consulting", 1, null, 100, 0, 0)],
        DiscountType: DiscountType.None,
        DiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: null,
        Terms: null,
        CustomInstructions: null,
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    [Fact]
    public async Task A_catalog_item_created_under_a_business_is_listed_only_there()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "scope-items@example.com");
        var defaultBusinessId = await DefaultBusinessIdAsync(client);
        var secondBusinessId = await CreateBusinessAsync(client, "Second Co");

        var create = await client.PostAsJsonAsync($"/api/v1/businesses/{secondBusinessId}/items", ValidItem("Only In Second"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        Assert.Equal(1, await ItemCountAsync(await client.GetAsync($"/api/v1/businesses/{secondBusinessId}/items")));
        Assert.Equal(0, await ItemCountAsync(await client.GetAsync($"/api/v1/businesses/{defaultBusinessId}/items")));
    }

    [Fact]
    public async Task An_estimate_created_under_a_business_is_listed_only_there()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "scope-estimates@example.com");
        var defaultBusinessId = await DefaultBusinessIdAsync(client);
        var secondBusinessId = await CreateBusinessAsync(client, "Second Co");

        var create = await client.PostAsJsonAsync($"/api/v1/businesses/{secondBusinessId}/estimates", ValidEstimate("EST-S-0001"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        Assert.Equal(1, await ItemCountAsync(await client.GetAsync($"/api/v1/businesses/{secondBusinessId}/estimates")));
        Assert.Equal(0, await ItemCountAsync(await client.GetAsync($"/api/v1/businesses/{defaultBusinessId}/estimates")));
    }

    [Fact]
    public async Task Invoices_show_up_in_the_document_list_and_outstanding_report_only_under_their_business()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "scope-documents@example.com");
        var defaultBusinessId = await DefaultBusinessIdAsync(client);
        var secondBusinessId = await CreateBusinessAsync(client, "Second Co");

        var create = await client.PostAsJsonAsync($"/api/v1/businesses/{secondBusinessId}/invoices", ValidInvoice("INV-S-0100"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        Assert.Equal(1, await ItemCountAsync(await client.GetAsync($"/api/v1/businesses/{secondBusinessId}/documents")));
        Assert.Equal(0, await ItemCountAsync(await client.GetAsync($"/api/v1/businesses/{defaultBusinessId}/documents")));
        Assert.Equal(1, await ItemCountAsync(await client.GetAsync($"/api/v1/businesses/{secondBusinessId}/reports/outstanding")));
        Assert.Equal(0, await ItemCountAsync(await client.GetAsync($"/api/v1/businesses/{defaultBusinessId}/reports/outstanding")));
    }

    [Fact]
    public async Task Another_accounts_business_is_not_found_for_items_estimates_documents_reports_or_dashboard()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "scope-other-owner@example.com");
        using var intruder = await RegisteredClientAsync(factory, "scope-other-intruder@example.com");
        var ownersBusinessId = await DefaultBusinessIdAsync(owner);

        var responses = new[]
        {
            await intruder.GetAsync($"/api/v1/businesses/{ownersBusinessId}/items"),
            await intruder.PostAsJsonAsync($"/api/v1/businesses/{ownersBusinessId}/items", ValidItem("Intruder")),
            await intruder.GetAsync($"/api/v1/businesses/{ownersBusinessId}/estimates"),
            await intruder.GetAsync($"/api/v1/businesses/{ownersBusinessId}/documents"),
            await intruder.GetAsync($"/api/v1/businesses/{ownersBusinessId}/reports/outstanding"),
            await intruder.GetAsync($"/api/v1/businesses/{ownersBusinessId}/dashboard/summary"),
        };

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
    }

    [Fact]
    public async Task Another_accounts_business_logo_cannot_be_uploaded_or_removed()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "scope-logo-owner@example.com");
        using var intruder = await RegisteredClientAsync(factory, "scope-logo-intruder@example.com");
        var ownersBusinessId = await DefaultBusinessIdAsync(owner);

        var png = new byte[64];
        new byte[] { 0x89, 0x50, 0x4E, 0x47 }.CopyTo(png, 0);
        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(png);
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
        form.Add(file, "file", "logo.png");

        var upload = await intruder.PostAsync($"/api/v1/businesses/{ownersBusinessId}/logo", form);
        var remove = await intruder.DeleteAsync($"/api/v1/businesses/{ownersBusinessId}/logo");

        Assert.Equal(HttpStatusCode.NotFound, upload.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, remove.StatusCode);
    }

    [Fact]
    public async Task Another_accounts_business_cannot_start_a_stripe_connect()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "scope-stripe-owner@example.com");
        using var intruder = await RegisteredClientAsync(factory, "scope-stripe-intruder@example.com");
        var ownersBusinessId = await DefaultBusinessIdAsync(owner);

        var response = await intruder.GetAsync($"/api/v1/businesses/{ownersBusinessId}/stripe/connect");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Null(response.Headers.Location);
    }

    [Fact]
    public async Task A_stripe_connect_for_a_business_stores_that_business_in_the_state_cookie()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "scope-stripe-own@example.com");
        var secondBusinessId = await CreateBusinessAsync(client, "Second Co");

        var response = await client.GetAsync($"/api/v1/businesses/{secondBusinessId}/stripe/connect");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        var cookies = response.Headers.GetValues("Set-Cookie").ToList();
        Assert.Contains(cookies, cookie => cookie.Contains($".{secondBusinessId}", StringComparison.Ordinal));
    }
}
