using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Customers;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Application.Purchasing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Api.Tests.Purchasing;

/// <summary>
/// Verifies IG-236's AC at the real HTTP pipeline level: a purchase order is created through the
/// shared document surface, carries its own numbering sequence independent of invoice numbering,
/// and is distinguishable from other document types on the read model the list and detail views
/// render. Also pins the two IG-291 defects found under IG-292 - numbering derived from today
/// rather than the purchase order's issue date, and soft-deleted purchase orders staying
/// retrievable.
/// </summary>
public class PurchaseOrderEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static readonly DateOnly IssueDate = new(2030, 8, 1);
    private static readonly DateOnly DueDate = new(2030, 8, 15);

    private static string Endpoint(Guid businessId) => $"/api/v1/businesses/{businessId}/purchase-orders";

    private static CreatePurchaseOrderCommand ValidCommand(Guid supplierId, DateOnly? issueDate = null) => new(
        SupplierId: supplierId,
        IssueDate: issueDate ?? IssueDate,
        DueDate: DueDate,
        Currency: "AUD",
        Reference: "REQ-9",
        // Quantity 2 x UnitPrice 100 = 200 subtotal, 10% tax = 20, total 220.
        Items: [new PurchaseOrderLineItem("Steel bracket", 2, "Each", 100, 10, 0)],
        Notes: "Deliver to loading dock",
        Terms: null,
        DeliveryInstructions: "Call on arrival",
        TemplateId: null,
        TemplateCustomization: null);

    private static CustomerRequest ValidSupplier(string name = "Bolt Supply Co") => new(
        name, "Jamie Lee", "sales@bolt.example", "0400000000",
        "1 Main St", null, "Sydney", "NSW", "2000", "AU", "12345", "Preferred supplier");

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> BusinessIdAsync(HttpClient client)
    {
        var profile = await client.GetFromJsonAsync<BusinessProfileDto>("/api/v1/business", JsonOptions);
        return profile!.Id;
    }

    private static async Task<Guid> SupplierIdAsync(HttpClient client, string name = "Bolt Supply Co")
    {
        var response = await client.PostAsJsonAsync("/api/v1/customers", ValidSupplier(name));
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<CustomerDto>(JsonOptions);
        return created!.Id;
    }

    private static async Task<PurchaseOrderDto> CreateAsync(HttpClient client, Guid businessId, Guid supplierId, DateOnly? issueDate = null)
    {
        var response = await client.PostAsJsonAsync(Endpoint(businessId), ValidCommand(supplierId, issueDate));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PurchaseOrderDto>(JsonOptions))!;
    }

    [Fact]
    public async Task Missing_session_cannot_create_a_purchase_order()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(Endpoint(Guid.NewGuid()), ValidCommand(Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Missing_session_cannot_list_purchase_orders()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(Endpoint(Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Creates_a_purchase_order_with_its_supplier_name_and_calculated_totals()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "po-create@example.com");
        var businessId = await BusinessIdAsync(client);
        var supplierId = await SupplierIdAsync(client);

        var response = await client.PostAsJsonAsync(Endpoint(businessId), ValidCommand(supplierId));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<PurchaseOrderDto>(JsonOptions);
        Assert.NotNull(created);
        Assert.Equal("Bolt Supply Co", created!.SupplierName);
        Assert.Equal(200m, created.Subtotal);
        Assert.Equal(20m, created.TaxAmount);
        Assert.Equal(220m, created.TotalAmount);
        Assert.Equal(IssueDate, created.IssueDate);
        Assert.Equal($"{Endpoint(businessId)}/{created.Id}", response.Headers.Location?.OriginalString);
    }

    /// <summary>
    /// Pins the wire contract the list and detail views read. PONumber's leading acronym makes its
    /// camel-cased name non-obvious, and getting it wrong renders a blank document number rather
    /// than failing.
    /// </summary>
    [Fact]
    public async Task Serialises_the_purchase_order_fields_the_document_views_read()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "po-contract@example.com");
        var businessId = await BusinessIdAsync(client);
        var supplierId = await SupplierIdAsync(client);

        var response = await client.PostAsJsonAsync(Endpoint(businessId), ValidCommand(supplierId));
        var json = await response.Content.ReadAsStringAsync();

        Assert.Contains("\"poNumber\":\"PO-20300801-001\"", json);
        Assert.Contains("\"supplierName\":\"Bolt Supply Co\"", json);
        Assert.Contains("\"totalAmount\":220", json);
    }

    /// <summary>
    /// IG-292 regression. Numbering previously counted rows whose IssueDate was today while
    /// storing the caller-supplied issue date and embedding today's date in the number, so a
    /// purchase order issued on any other date always numbered PO-{today}-001 and the second one
    /// collided with the unique (business_id, po_number) index as an unhandled 500.
    /// </summary>
    [Fact]
    public async Task Numbers_purchase_orders_sequentially_from_their_own_issue_date()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "po-sequence@example.com");
        var businessId = await BusinessIdAsync(client);
        var supplierId = await SupplierIdAsync(client);

        var first = await CreateAsync(client, businessId, supplierId);
        var second = await CreateAsync(client, businessId, supplierId);

        Assert.Equal("PO-20300801-001", first.PONumber);
        Assert.Equal("PO-20300801-002", second.PONumber);
    }

    [Fact]
    public async Task Numbers_purchase_orders_independently_per_issue_date()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "po-per-date@example.com");
        var businessId = await BusinessIdAsync(client);
        var supplierId = await SupplierIdAsync(client);

        var august = await CreateAsync(client, businessId, supplierId, new DateOnly(2030, 8, 1));
        var september = await CreateAsync(client, businessId, supplierId, new DateOnly(2030, 9, 2));

        Assert.Equal("PO-20300801-001", august.PONumber);
        Assert.Equal("PO-20300902-001", september.PONumber);
    }

    /// <summary>IG-236 AC: the purchase order sequence must not share invoice numbering.</summary>
    [Fact]
    public async Task Purchase_order_numbering_is_independent_of_invoice_numbering()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "po-independent@example.com");
        var businessId = await BusinessIdAsync(client);
        var supplierId = await SupplierIdAsync(client);

        var invoice = await client.PostAsJsonAsync("/api/v1/invoices", new InvoiceSaveRequest(
            InvoiceNumber: "INV-0007",
            IssueDate: IssueDate,
            DueDate: DueDate,
            Reference: null,
            Currency: "AUD",
            Seller: "My Business",
            Customer: "Bolt Supply Co",
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
            TemplateCustomization: null));
        invoice.EnsureSuccessStatusCode();

        var po = await CreateAsync(client, businessId, supplierId);

        // The invoice above consumed its own sequence; the purchase order still starts at 001 and
        // carries the PO- prefix rather than continuing the invoice numbering.
        Assert.Equal("PO-20300801-001", po.PONumber);
    }

    [Fact]
    public async Task Rejects_a_purchase_order_for_an_unknown_supplier()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "po-bad-supplier@example.com");
        var businessId = await BusinessIdAsync(client);

        var response = await client.PostAsJsonAsync(Endpoint(businessId), ValidCommand(Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Lists_only_the_owning_accounts_purchase_orders()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var ownerClient = await RegisteredClientAsync(factory, "po-owner@example.com");
        var ownerBusinessId = await BusinessIdAsync(ownerClient);
        var ownerSupplierId = await SupplierIdAsync(ownerClient);
        await CreateAsync(ownerClient, ownerBusinessId, ownerSupplierId);

        using var otherClient = await RegisteredClientAsync(factory, "po-other@example.com");

        var response = await otherClient.GetAsync(Endpoint(ownerBusinessId));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Another_accounts_purchase_order_is_not_retrievable()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var ownerClient = await RegisteredClientAsync(factory, "po-detail-owner@example.com");
        var ownerBusinessId = await BusinessIdAsync(ownerClient);
        var ownerSupplierId = await SupplierIdAsync(ownerClient);
        var po = await CreateAsync(ownerClient, ownerBusinessId, ownerSupplierId);

        using var otherClient = await RegisteredClientAsync(factory, "po-detail-other@example.com");
        var otherBusinessId = await BusinessIdAsync(otherClient);

        var response = await otherClient.GetAsync($"{Endpoint(otherBusinessId)}/{po.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Lists_purchase_orders_newest_issue_date_first()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "po-order@example.com");
        var businessId = await BusinessIdAsync(client);
        var supplierId = await SupplierIdAsync(client);

        await CreateAsync(client, businessId, supplierId, new DateOnly(2030, 8, 1));
        await CreateAsync(client, businessId, supplierId, new DateOnly(2030, 9, 2));

        var listed = await client.GetFromJsonAsync<List<PurchaseOrderDto>>(Endpoint(businessId), JsonOptions);

        Assert.Equal(2, listed!.Count);
        Assert.Equal("PO-20300902-001", listed[0].PONumber);
        Assert.Equal("PO-20300801-001", listed[1].PONumber);
    }

    /// <summary>
    /// IG-292: deleting soft-deletes, which already hid the purchase order from the list but left
    /// the detail endpoint serving it.
    /// </summary>
    [Fact]
    public async Task Deleting_a_purchase_order_hides_it_from_both_the_list_and_the_detail()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "po-delete@example.com");
        var businessId = await BusinessIdAsync(client);
        var supplierId = await SupplierIdAsync(client);
        var po = await CreateAsync(client, businessId, supplierId);

        var deleteResponse = await client.DeleteAsync($"{Endpoint(businessId)}/{po.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var listed = await client.GetFromJsonAsync<List<PurchaseOrderDto>>(Endpoint(businessId), JsonOptions);
        Assert.Empty(listed!);

        var detailResponse = await client.GetAsync($"{Endpoint(businessId)}/{po.Id}");
        Assert.Equal(HttpStatusCode.NotFound, detailResponse.StatusCode);

        var repeatDelete = await client.DeleteAsync($"{Endpoint(businessId)}/{po.Id}");
        Assert.Equal(HttpStatusCode.NotFound, repeatDelete.StatusCode);
    }

    /// <summary>
    /// A deleted purchase order's number is never reused, so an accounting number always points at
    /// exactly one document.
    /// </summary>
    [Fact]
    public async Task Does_not_reuse_the_number_of_a_deleted_purchase_order()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "po-no-reuse@example.com");
        var businessId = await BusinessIdAsync(client);
        var supplierId = await SupplierIdAsync(client);

        var first = await CreateAsync(client, businessId, supplierId);
        await client.DeleteAsync($"{Endpoint(businessId)}/{first.Id}");

        var second = await CreateAsync(client, businessId, supplierId);

        Assert.Equal("PO-20300801-001", first.PONumber);
        Assert.Equal("PO-20300801-002", second.PONumber);
    }
}
