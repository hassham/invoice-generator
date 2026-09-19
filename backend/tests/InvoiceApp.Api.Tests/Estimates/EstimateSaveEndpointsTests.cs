using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Customers;
using InvoiceApp.Application.Estimates;
using InvoiceApp.Application.Identity;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Estimates;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Api.Tests.Estimates;

/// <summary>Verifies IG-220's AC at the real HTTP pipeline level: an estimate can be created,
/// saved, and viewed - reusing the exact same customer find-or-create/uniqueness-check/calculation
/// patterns InvoiceSaveEndpointsTests already verifies for invoices, applied to the new, separate
/// Estimate entity/table.</summary>
public class EstimateSaveEndpointsTests
{
    private const string EstimatesEndpoint = "/api/v1/estimates";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static EstimateSaveRequest ValidRequest(string estimateNumber = "EST-0001", string customer = "Acme Pty Ltd") => new(
        EstimateNumber: estimateNumber,
        IssueDate: new DateOnly(2030, 8, 1),
        ExpiryDate: new DateOnly(2030, 8, 15),
        Reference: "PO-9",
        Currency: "AUD",
        Seller: "My Business",
        Customer: customer,
        ShipTo: null,
        Items: [new EstimateSaveLineItem("Consulting", 2, "Hour", 100, 10, 0)],
        DiscountType: DiscountType.None,
        DiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: "Thanks for your interest",
        Terms: null,
        CustomInstructions: "Valid for 14 days",
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    [Fact]
    public async Task Missing_session_cannot_create_an_estimate()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Creates_a_draft_estimate_and_finds_or_creates_the_customer_from_free_text()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-create@example.com");

        var response = await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest(customer: "Acme Pty Ltd\n123 Main St"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);
        Assert.NotNull(created);
        Assert.Equal("EST-0001", created!.EstimateNumber);
        Assert.Equal(EstimateStatus.Draft, created.Status);
        Assert.Equal(220m, created.TotalAmount); // 2 * 100 = 200 + 10% tax = 220
        Assert.Equal($"{EstimatesEndpoint}/{created.Id}", response.Headers.Location?.OriginalString);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var customer = await db.Customers.SingleAsync(c => c.Id == created.CustomerId);
        Assert.Equal("Acme Pty Ltd", customer.BusinessName);
        Assert.Equal("123 Main St", customer.Notes);
    }

    [Fact]
    public async Task Rejects_a_duplicate_estimate_number_for_the_same_business_with_a_conflict()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-conflict@example.com");
        await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest(estimateNumber: "EST-DUPLICATE"));

        var response = await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest(estimateNumber: "EST-DUPLICATE", customer: "A Different Customer"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("already exists", body);
    }

    [Fact]
    public async Task Rejects_a_request_missing_the_customer_field()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-invalid@example.com");

        var response = await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest() with { Customer = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Bill To is required.", body);
    }

    [Fact]
    public async Task Rejects_an_expiry_date_earlier_than_the_issue_date()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-expiry@example.com");

        var response = await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest() with { ExpiryDate = new DateOnly(2030, 7, 1) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Expiry date cannot be earlier than the issue date.", body);
    }

    [Fact]
    public async Task Updates_an_existing_estimate_and_replaces_its_line_items()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-update@example.com");
        var createResponse = await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);

        var updateRequest = ValidRequest() with { Items = [new EstimateSaveLineItem("Updated Service", 1, null, 500, 10, 0)] };
        var updateResponse = await client.PutAsJsonAsync($"{EstimatesEndpoint}/{created!.Id}", updateRequest);

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);
        Assert.Equal(created.Id, updated!.Id);
        Assert.Equal(550m, updated.TotalAmount);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var items = await db.EstimateItems.Where(i => i.EstimateId == created.Id).ToListAsync();
        Assert.Single(items);
        Assert.Equal("Updated Service", items[0].Description);
    }

    [Fact]
    public async Task Cannot_update_another_accounts_estimate()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "estimate-owner@example.com");
        var createResponse = await ownerClient.PostAsJsonAsync(EstimatesEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);

        using var otherClient = await RegisteredClientAsync(factory, "estimate-other@example.com");
        var response = await otherClient.PutAsJsonAsync($"{EstimatesEndpoint}/{created!.Id}", ValidRequest());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Gets_the_full_editable_content_of_a_saved_estimate()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-get@example.com");
        var request = ValidRequest() with { ShipTo = "Warehouse 3\n45 Dock Rd" };
        var createResponse = await client.PostAsJsonAsync(EstimatesEndpoint, request);
        var created = await createResponse.Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);

        var response = await client.GetAsync($"{EstimatesEndpoint}/{created!.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var detail = await response.Content.ReadFromJsonAsync<EstimateDetailDto>(JsonOptions);
        Assert.NotNull(detail);
        Assert.Equal("EST-0001", detail!.EstimateNumber);
        Assert.Equal("My Business", detail.Seller);
        Assert.Equal("Acme Pty Ltd", detail.Customer);
        Assert.Equal("Warehouse 3\n45 Dock Rd", detail.ShipTo);
        Assert.Single(detail.Items);
        Assert.Equal("Consulting", detail.Items[0].Description);
        Assert.Contains("Valid for 14 days", detail.PaymentInstructions);
    }

    [Fact]
    public async Task Cannot_get_another_accounts_estimate()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "estimate-get-owner@example.com");
        var createResponse = await ownerClient.PostAsJsonAsync(EstimatesEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);

        using var otherClient = await RegisteredClientAsync(factory, "estimate-get-other@example.com");
        var response = await otherClient.GetAsync($"{EstimatesEndpoint}/{created!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Lists_only_the_signed_in_accounts_estimates_newest_first()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-list-owner@example.com");
        await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest(estimateNumber: "EST-0001", customer: "Acme Pty Ltd"));
        await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest(estimateNumber: "EST-0002", customer: "Beta Pty Ltd"));

        using var otherClient = await RegisteredClientAsync(factory, "estimate-list-other@example.com");
        await otherClient.PostAsJsonAsync(EstimatesEndpoint, ValidRequest(estimateNumber: "EST-0001", customer: "Someone Else"));

        var response = await client.GetAsync(EstimatesEndpoint);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<EstimateListResponse>(JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(2, result!.TotalCount);
        Assert.Equal("EST-0002", result.Items[0].EstimateNumber); // newest first
        Assert.Equal("Beta Pty Ltd", result.Items[0].CustomerName);
        Assert.Equal("EST-0001", result.Items[1].EstimateNumber);
    }

    [Fact]
    public async Task Uses_a_selected_customer_id_directly_instead_of_find_or_create()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-picker@example.com");
        var customerResponse = await client.PostAsJsonAsync(
            "/api/v1/customers",
            new CustomerRequest("Selected Customer Pty Ltd", null, "billing@acme.example", null, null, null, null, null, null, null, null, null));
        var customer = await customerResponse.Content.ReadFromJsonAsync<CustomerDto>(JsonOptions);

        var request = ValidRequest(customer: "Some Unrelated Typed Text") with { CustomerId = customer!.Id };
        var response = await client.PostAsJsonAsync(EstimatesEndpoint, request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);
        Assert.Equal(customer.Id, created!.CustomerId);
    }
}
