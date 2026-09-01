using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Api.Tests.Invoicing;

/// <summary>
/// Verifies IG-45's own AC at the real HTTP pipeline level: manual save persists a valid
/// account-owned invoice, and the customer_id NOT NULL FK is resolved via find-or-create against
/// the free-text Customer field (IG-193/IG-55) rather than needing a structured picker (IG-56).
/// </summary>
public class InvoiceSaveEndpointsTests
{
    private const string InvoicesEndpoint = "/api/v1/invoices";

    // Mirrors Program.cs's global JsonStringEnumConverter registration (InvoiceStatus is
    // serialized as its string name over the wire) - HttpClient's ReadFromJsonAsync doesn't pick
    // that server-side option up automatically, so tests need the same converter to deserialize it.
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static InvoiceSaveRequest ValidRequest(string invoiceNumber = "INV-0001", string customer = "Acme Pty Ltd") => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: new DateOnly(2026, 8, 1),
        DueDate: new DateOnly(2026, 8, 15),
        Reference: "PO-9",
        Currency: "AUD",
        Seller: "My Business",
        Customer: customer,
        ShipTo: null,
        Items: [new InvoiceSaveLineItem("Consulting", 2, "Hour", 100, 10, 0)],
        InvoiceDiscountType: DiscountType.None,
        InvoiceDiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: "Thanks for your business",
        Terms: null,
        CustomInstructions: "Pay via bank transfer",
        PaymentInstructions: new InvoiceSavePaymentInstructions("Big Bank", "My Business", "123-456", "00011122", null, null, "INV-0001"),
        TemplateId: null,
        TemplateCustomization: null);

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    [Fact]
    public async Task Missing_session_cannot_create_an_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Creates_an_invoice_and_finds_or_creates_the_customer_from_free_text()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "save-create@example.com");

        var response = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest(customer: "Acme Pty Ltd\n123 Main St"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        Assert.NotNull(created);
        Assert.Equal("INV-0001", created!.InvoiceNumber);
        Assert.Equal(InvoiceStatus.Draft, created.Status);
        Assert.Equal(220m, created.TotalAmount); // 2 * 100 = 200 + 10% tax = 220
        Assert.Equal($"{InvoicesEndpoint}/{created.Id}", response.Headers.Location?.OriginalString);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var customer = await db.Customers.SingleAsync(c => c.Id == created.CustomerId);
        Assert.Equal("Acme Pty Ltd", customer.BusinessName);
        Assert.Equal("123 Main St", customer.Notes);
    }

    [Fact]
    public async Task Reuses_an_existing_customer_matched_case_insensitively_by_name()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "save-reuse@example.com");
        var first = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest(invoiceNumber: "INV-0001", customer: "Acme Pty Ltd"));
        var firstInvoice = await first.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var second = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest(invoiceNumber: "INV-0002", customer: "acme pty ltd"));
        var secondInvoice = await second.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        Assert.Equal(firstInvoice!.CustomerId, secondInvoice!.CustomerId);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await db.Customers.CountAsync());
    }

    [Fact]
    public async Task Rejects_a_duplicate_invoice_number_for_the_same_business_with_a_conflict()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "save-conflict@example.com");
        await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest(invoiceNumber: "INV-DUPLICATE"));

        var response = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest(invoiceNumber: "INV-DUPLICATE", customer: "A Different Customer"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("already exists", body);
    }

    [Fact]
    public async Task Rejects_a_request_missing_the_customer_field()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "save-invalid@example.com");

        var response = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest() with { Customer = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Bill To is required.", body);
    }

    [Fact]
    public async Task Updates_an_existing_invoice_and_replaces_its_line_items()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "save-update@example.com");
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var updateRequest = ValidRequest() with { Items = [new InvoiceSaveLineItem("Updated Service", 1, null, 500, 10, 0)] };
        var updateResponse = await client.PutAsJsonAsync($"{InvoicesEndpoint}/{created!.Id}", updateRequest);

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        Assert.Equal(created.Id, updated!.Id);
        Assert.Equal(550m, updated.TotalAmount); // 500 + 10% tax

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var items = await db.InvoiceItems.Where(i => i.InvoiceId == created.Id).ToListAsync();
        Assert.Single(items);
        Assert.Equal("Updated Service", items[0].Description);
    }

    [Fact]
    public async Task Cannot_update_another_accounts_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "save-owner@example.com");
        var createResponse = await ownerClient.PostAsJsonAsync(InvoicesEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        using var otherClient = await RegisteredClientAsync(factory, "save-other@example.com");
        var response = await otherClient.PutAsJsonAsync($"{InvoicesEndpoint}/{created!.Id}", ValidRequest());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Missing_session_cannot_get_an_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"{InvoicesEndpoint}/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Gets_the_full_editable_content_of_a_saved_invoice_including_ship_to()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "get-detail@example.com");
        var request = ValidRequest() with { ShipTo = "Warehouse 3\n45 Dock Rd" };
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, request);
        var created = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        var response = await client.GetAsync($"{InvoicesEndpoint}/{created!.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var detail = await response.Content.ReadFromJsonAsync<InvoiceDetailDto>(JsonOptions);
        Assert.NotNull(detail);
        Assert.Equal("INV-0001", detail!.InvoiceNumber);
        Assert.Equal("My Business", detail.Seller);
        Assert.Equal("Acme Pty Ltd", detail.Customer);
        Assert.Equal("Warehouse 3\n45 Dock Rd", detail.ShipTo);
        Assert.Single(detail.Items);
        Assert.Equal("Consulting", detail.Items[0].Description);
        Assert.Equal(2, detail.Items[0].Quantity);
        Assert.Equal(100, detail.Items[0].UnitPrice);
        Assert.Equal("Thanks for your business", detail.Notes);
        Assert.Contains("Bank Name: Big Bank", detail.PaymentInstructions);
        Assert.Contains("Pay via bank transfer", detail.PaymentInstructions);
    }

    [Fact]
    public async Task Get_reflects_an_update_including_the_replaced_line_items()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "get-after-update@example.com");
        var createResponse = await client.PostAsJsonAsync(InvoicesEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        await client.PutAsJsonAsync(
            $"{InvoicesEndpoint}/{created!.Id}",
            ValidRequest() with { Items = [new InvoiceSaveLineItem("Updated Service", 1, null, 500, 10, 0)] });

        var response = await client.GetAsync($"{InvoicesEndpoint}/{created.Id}");

        var detail = await response.Content.ReadFromJsonAsync<InvoiceDetailDto>(JsonOptions);
        Assert.Single(detail!.Items);
        Assert.Equal("Updated Service", detail.Items[0].Description);
        Assert.Equal(550m, detail.TotalAmount);
    }

    [Fact]
    public async Task Cannot_get_another_accounts_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "get-owner@example.com");
        var createResponse = await ownerClient.PostAsJsonAsync(InvoicesEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);

        using var otherClient = await RegisteredClientAsync(factory, "get-other@example.com");
        var response = await otherClient.GetAsync($"{InvoicesEndpoint}/{created!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
