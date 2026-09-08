using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Catalog;
using InvoiceApp.Application.Customers;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Api.Tests.Security;

/// <summary>
/// Verifies IG-70's own AC (FSD section 87: "SQL injection prevention", "XSS protection", "Input
/// sanitisation"): free-text fields accept SQL-injection-style and XSS-style payloads without
/// erroring, corrupting data, or executing anything - they're stored and returned back verbatim,
/// as inert text. This holds structurally rather than through explicit sanitisation code: EF Core
/// parameterizes every query (confirmed by grep - the one raw SQL statement in the codebase,
/// BusinessService.GenerateNextInvoiceNumberAsync, uses EF's interpolated-parameter syntax, not
/// string concatenation), and nothing on the backend ever interprets a stored string as markup or
/// a further query. A real crash/500, a truncated/mangled value, or evidence the underlying table
/// was actually affected would indicate an actual gap; none of those happen here.
/// </summary>
public class UnsafeInputTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private const string SqlInjectionPayload = "Robert'); DROP TABLE customer.customers;--";
    private const string XssPayload = "<script>alert('xss')</script><img src=x onerror=alert(1)>";

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    [Fact]
    public async Task Sql_injection_style_text_survives_a_customer_round_trip_verbatim()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "sql-injection@example.com");
        var request = new CustomerRequest(SqlInjectionPayload, null, null, null, null, null, null, null, null, null, null, null);

        var createResponse = await client.PostAsJsonAsync("/api/v1/customers", request);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<CustomerDto>();
        Assert.Equal(SqlInjectionPayload, created!.BusinessName);

        // The underlying table must still be intact and queryable - proves the payload was never
        // executed as SQL, just stored as an ordinary string value.
        var listResponse = await client.GetAsync("/api/v1/customers");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var list = await listResponse.Content.ReadFromJsonAsync<List<CustomerDto>>();
        Assert.Contains(list!, c => c.Id == created.Id && c.BusinessName == SqlInjectionPayload);
    }

    [Fact]
    public async Task Xss_style_text_survives_a_customer_notes_field_round_trip_verbatim()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "xss-customer@example.com");
        var request = new CustomerRequest("Acme Pty Ltd", null, null, null, null, null, null, null, null, null, null, XssPayload);

        var createResponse = await client.PostAsJsonAsync("/api/v1/customers", request);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<CustomerDto>();
        // Stored/returned as plain JSON string data, not markup - no escaping/stripping applied
        // or needed server-side; the frontend's React rendering is what neutralizes it on display.
        Assert.Equal(XssPayload, created!.Notes);
    }

    [Fact]
    public async Task Unsafe_text_survives_an_invoices_free_text_fields_round_trip_verbatim()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "unsafe-invoice@example.com");
        var request = new InvoiceSaveRequest(
            InvoiceNumber: "INV-UNSAFE-1",
            IssueDate: new DateOnly(2030, 1, 1),
            DueDate: new DateOnly(2030, 1, 15),
            Reference: SqlInjectionPayload,
            Currency: "AUD",
            Seller: XssPayload,
            Customer: SqlInjectionPayload,
            ShipTo: XssPayload,
            Items: [new InvoiceSaveLineItem(SqlInjectionPayload, 1, null, 100, 0, 0)],
            InvoiceDiscountType: DiscountType.None,
            InvoiceDiscountValue: null,
            TaxCalculationMethod: TaxCalculationMethod.Exclusive,
            Notes: XssPayload,
            Terms: SqlInjectionPayload,
            CustomInstructions: XssPayload,
            PaymentInstructions: null,
            TemplateId: null,
            TemplateCustomization: null);

        var createResponse = await client.PostAsJsonAsync("/api/v1/invoices", request);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var getResponse = await client.GetAsync($"/api/v1/invoices/{created!.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var detail = await getResponse.Content.ReadFromJsonAsync<InvoiceDetailDto>(JsonOptions);

        Assert.Equal(SqlInjectionPayload, detail!.Reference);
        Assert.Equal(XssPayload, detail.Seller);
        Assert.Equal(SqlInjectionPayload, detail.Customer);
        Assert.Equal(XssPayload, detail.ShipTo);
        Assert.Equal(SqlInjectionPayload, detail.Items[0].Description);
        Assert.Equal(XssPayload, detail.Notes);
        Assert.Equal(SqlInjectionPayload, detail.Terms);

        // The database itself is still intact and queryable afterward.
        var listResponse = await client.GetAsync("/api/v1/invoices");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
    }

    [Fact]
    public async Task Unsafe_text_survives_a_catalog_item_round_trip_verbatim()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "unsafe-item@example.com");
        var request = new CatalogItemRequest(SqlInjectionPayload, XssPayload, XssPayload, null, 100m, 10m);

        var createResponse = await client.PostAsJsonAsync("/api/v1/items", request);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<CatalogItemDto>();
        Assert.Equal(SqlInjectionPayload, created!.Name);
        Assert.Equal(XssPayload, created.Description);
        Assert.Equal(XssPayload, created.SKU);
    }

    [Fact]
    public async Task Unsafe_text_survives_a_business_profile_round_trip_verbatim()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "unsafe-business@example.com");
        var request = new BusinessProfileRequest(
            BusinessName: SqlInjectionPayload,
            LegalName: XssPayload,
            Email: null,
            Phone: null,
            Website: null,
            AddressLine1: null,
            AddressLine2: null,
            City: null,
            State: null,
            PostalCode: null,
            Country: "AU",
            RegistrationNumber: null,
            TaxNumber: null,
            DefaultCurrency: "AUD",
            DefaultTaxRate: 10,
            TaxCalculationMethod: TaxCalculationMethod.Exclusive,
            DefaultPaymentTerms: PaymentTermsOption.Net30,
            DefaultPaymentTermsDays: null,
            DefaultInvoiceNotes: XssPayload,
            DefaultTermsAndConditions: SqlInjectionPayload,
            DefaultTemplateId: null,
            InvoicePrefix: "INV-",
            NextInvoiceNumber: 1,
            InvoiceNumberPadding: 4);

        var response = await client.PutAsJsonAsync("/api/v1/business", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.Equal(SqlInjectionPayload, updated!.BusinessName);
        Assert.Equal(XssPayload, updated.LegalName);

        var getResponse = await client.GetAsync("/api/v1/business");
        var fetched = await getResponse.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.Equal(SqlInjectionPayload, fetched!.BusinessName);
    }
}
