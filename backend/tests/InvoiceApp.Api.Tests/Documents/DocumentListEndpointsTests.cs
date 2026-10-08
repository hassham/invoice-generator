using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Customers;
using InvoiceApp.Application.Documents;
using InvoiceApp.Application.Estimates;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Application.Payments;
using InvoiceApp.Application.Purchasing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Domain.Payments;

namespace InvoiceApp.Api.Tests.Documents;

/// <summary>
/// IG-237/IG-293: the unified document list. Its acceptance criterion is that the list can be
/// filtered by document type "without breaking existing invoice-only behavior", so these cover both
/// halves - that all five types appear and filter correctly, and that each type still reports its
/// own number, counterparty and amount rather than being flattened into something invoice-shaped.
/// </summary>
public class DocumentListEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private const string Endpoint = "/api/v1/documents";

    private static readonly DateOnly IssueDate = new(2030, 8, 1);

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> BusinessIdAsync(HttpClient client)
    {
        var profile = await client.GetFromJsonAsync<BusinessProfileDto>("/api/v1/business", JsonOptions);
        return profile!.Id;
    }

    private static InvoiceSaveRequest InvoiceRequest(string number, string customer, DateOnly issueDate, decimal unitPrice) => new(
        InvoiceNumber: number,
        IssueDate: issueDate,
        DueDate: issueDate.AddDays(14),
        Reference: null,
        Currency: "AUD",
        Seller: "My Business",
        Customer: customer,
        ShipTo: null,
        Items: [new InvoiceSaveLineItem("Consulting", 1, null, unitPrice, 0, 0)],
        InvoiceDiscountType: DiscountType.None,
        InvoiceDiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: null,
        Terms: null,
        CustomInstructions: null,
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    private static EstimateSaveRequest EstimateRequest(string number, string customer, DateOnly issueDate, decimal unitPrice) => new(
        EstimateNumber: number,
        IssueDate: issueDate,
        ExpiryDate: issueDate.AddDays(30),
        Reference: null,
        Currency: "AUD",
        Seller: "My Business",
        Customer: customer,
        ShipTo: null,
        Items: [new EstimateSaveLineItem("Design work", 1, null, unitPrice, 0, 0)],
        DiscountType: DiscountType.None,
        DiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: null,
        Terms: null,
        CustomInstructions: null,
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    private static async Task<Guid> CreateInvoiceAsync(HttpClient client, string number, string customer = "Acme Pty Ltd", DateOnly? issueDate = null, decimal unitPrice = 100)
    {
        var response = await client.PostAsJsonAsync("/api/v1/invoices", InvoiceRequest(number, customer, issueDate ?? IssueDate, unitPrice));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions))!.Id;
    }

    private static async Task CreateEstimateAsync(HttpClient client, string number, string customer = "Acme Pty Ltd", DateOnly? issueDate = null, decimal unitPrice = 900)
    {
        var response = await client.PostAsJsonAsync("/api/v1/estimates", EstimateRequest(number, customer, issueDate ?? IssueDate, unitPrice));
        response.EnsureSuccessStatusCode();
    }

    private static async Task CreateCreditNoteAsync(HttpClient client, Guid businessId, Guid invoiceId, decimal amount = 25)
    {
        var response = await client.PostAsJsonAsync($"/api/v1/businesses/{businessId}/credit-notes",
            new CreateCreditNoteCommand(invoiceId, amount, "Returned goods", null));
        response.EnsureSuccessStatusCode();
    }

    private static async Task CreateReceiptAsync(HttpClient client, Guid businessId, Guid invoiceId, decimal amount = 50)
    {
        var paymentResponse = await client.PostAsJsonAsync($"/api/v1/invoices/{invoiceId}/payments",
            new PaymentRequest(IssueDate, amount, PaymentMethod.BankTransfer, null, null));
        paymentResponse.EnsureSuccessStatusCode();

        using var payload = JsonDocument.Parse(await paymentResponse.Content.ReadAsStringAsync());
        var paymentId = payload.RootElement.GetProperty("payment").GetProperty("id").GetGuid();

        var receiptResponse = await client.PostAsJsonAsync($"/api/v1/businesses/{businessId}/receipts",
            new CreateReceiptCommand(paymentId));
        receiptResponse.EnsureSuccessStatusCode();
    }

    private static async Task<Guid> CreateSupplierAsync(HttpClient client, string name = "Bolt Supply Co")
    {
        var response = await client.PostAsJsonAsync("/api/v1/customers", new CustomerRequest(
            name, "Jamie Lee", "sales@bolt.example", null, null, null, null, null, null, null, null, null));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CustomerDto>(JsonOptions))!.Id;
    }

    private static async Task CreatePurchaseOrderAsync(HttpClient client, Guid businessId, Guid supplierId, DateOnly? issueDate = null, decimal unitPrice = 220)
    {
        var issue = issueDate ?? IssueDate;
        var response = await client.PostAsJsonAsync($"/api/v1/businesses/{businessId}/purchase-orders",
            new CreatePurchaseOrderCommand(
                SupplierId: supplierId,
                IssueDate: issue,
                DueDate: issue.AddDays(14),
                Currency: "AUD",
                Reference: null,
                Items: [new PurchaseOrderLineItem("Steel bracket", 1, null, unitPrice, 0, 0)],
                Notes: null,
                Terms: null,
                DeliveryInstructions: null,
                TemplateId: null,
                TemplateCustomization: null));
        response.EnsureSuccessStatusCode();
    }

    /// <summary>Seeds exactly one of every document type for a fresh account.</summary>
    private static async Task<Guid> SeedOneOfEachAsync(HttpClient client)
    {
        var businessId = await BusinessIdAsync(client);
        var invoiceId = await CreateInvoiceAsync(client, "INV-DOC-1");
        await CreateEstimateAsync(client, "EST-DOC-1");
        await CreateCreditNoteAsync(client, businessId, invoiceId);
        await CreateReceiptAsync(client, businessId, invoiceId);
        var supplierId = await CreateSupplierAsync(client);
        await CreatePurchaseOrderAsync(client, businessId, supplierId);
        return businessId;
    }

    private static async Task<DocumentListResponse> ListAsync(HttpClient client, string queryString = "")
    {
        var response = await client.GetAsync($"{Endpoint}{queryString}");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<DocumentListResponse>(JsonOptions))!;
    }

    [Fact]
    public async Task Missing_session_cannot_list_documents()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(Endpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_every_document_type_in_one_list()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-all@example.com");
        await SeedOneOfEachAsync(client);

        var result = await ListAsync(client);

        Assert.Equal(5, result.TotalCount);
        Assert.Equal(
            new[] { DocumentType.CreditNote, DocumentType.Estimate, DocumentType.Invoice, DocumentType.PurchaseOrder, DocumentType.Receipt },
            result.Items.Select(item => item.DocumentType).OrderBy(type => type.ToString()).ToArray());
    }

    [Theory]
    [InlineData(DocumentType.Invoice, "INV-DOC-1")]
    [InlineData(DocumentType.Estimate, "EST-DOC-1")]
    [InlineData(DocumentType.CreditNote, "CN-")]
    [InlineData(DocumentType.Receipt, "RCP-")]
    [InlineData(DocumentType.PurchaseOrder, "PO-")]
    public async Task Filters_to_a_single_document_type(DocumentType documentType, string expectedNumberPrefix)
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, $"doc-filter-{documentType}@example.com");
        await SeedOneOfEachAsync(client);

        var result = await ListAsync(client, $"?documentType={documentType}");

        var item = Assert.Single(result.Items);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(documentType, item.DocumentType);
        Assert.StartsWith(expectedNumberPrefix, item.DocumentNumber);
    }

    /// <summary>
    /// The AC's "without breaking existing invoice-only behavior" half: each type must still carry
    /// its own identity through the shared shape, not an invoice-shaped approximation of it.
    /// </summary>
    [Fact]
    public async Task Each_type_reports_its_own_number_counterparty_and_amount()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-identity@example.com");
        await SeedOneOfEachAsync(client);

        var items = (await ListAsync(client)).Items.ToDictionary(item => item.DocumentType);

        Assert.Equal("Acme Pty Ltd", items[DocumentType.Invoice].PartyName);
        Assert.Equal(100m, items[DocumentType.Invoice].TotalAmount);
        Assert.Equal(900m, items[DocumentType.Estimate].TotalAmount);
        Assert.Equal(25m, items[DocumentType.CreditNote].TotalAmount);
        Assert.Equal(50m, items[DocumentType.Receipt].TotalAmount);

        // A purchase order's counterparty is the supplier, not the account's customer.
        Assert.Equal("Bolt Supply Co", items[DocumentType.PurchaseOrder].PartyName);
        Assert.Equal(220m, items[DocumentType.PurchaseOrder].TotalAmount);
    }

    [Fact]
    public async Task Reports_a_status_only_for_the_types_that_have_one()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-status@example.com");
        await SeedOneOfEachAsync(client);

        var items = (await ListAsync(client)).Items.ToDictionary(item => item.DocumentType);

        Assert.False(string.IsNullOrEmpty(items[DocumentType.Invoice].Status));
        Assert.False(string.IsNullOrEmpty(items[DocumentType.Estimate].Status));
        Assert.Null(items[DocumentType.CreditNote].Status);
        Assert.Null(items[DocumentType.Receipt].Status);
        Assert.Null(items[DocumentType.PurchaseOrder].Status);
    }

    [Fact]
    public async Task Searches_across_types_by_document_number()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-search-number@example.com");
        await SeedOneOfEachAsync(client);

        var result = await ListAsync(client, "?search=EST-DOC");

        var item = Assert.Single(result.Items);
        Assert.Equal(DocumentType.Estimate, item.DocumentType);
    }

    [Fact]
    public async Task Searches_across_types_by_counterparty_name()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-search-party@example.com");
        await SeedOneOfEachAsync(client);

        var result = await ListAsync(client, "?search=bolt");

        var item = Assert.Single(result.Items);
        Assert.Equal(DocumentType.PurchaseOrder, item.DocumentType);
    }

    [Fact]
    public async Task Filters_by_issue_date_range()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-dates@example.com");
        await BusinessIdAsync(client);
        await CreateInvoiceAsync(client, "INV-OLD", issueDate: new DateOnly(2029, 1, 10));
        await CreateInvoiceAsync(client, "INV-NEW", issueDate: new DateOnly(2031, 6, 20));

        var result = await ListAsync(client, "?startDate=2031-01-01&endDate=2031-12-31");

        var item = Assert.Single(result.Items);
        Assert.Equal("INV-NEW", item.DocumentNumber);
    }

    [Fact]
    public async Task Sorts_newest_first_by_issue_date_by_default()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-sort@example.com");
        await CreateInvoiceAsync(client, "INV-OLD", issueDate: new DateOnly(2029, 1, 10));
        await CreateEstimateAsync(client, "EST-NEW", issueDate: new DateOnly(2031, 6, 20));

        var newestFirst = await ListAsync(client);
        var oldestFirst = await ListAsync(client, "?sort=Oldest");

        Assert.Equal("EST-NEW", newestFirst.Items[0].DocumentNumber);
        Assert.Equal("INV-OLD", oldestFirst.Items[0].DocumentNumber);
    }

    [Fact]
    public async Task Sorts_by_amount_across_document_types()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-amount@example.com");
        await CreateInvoiceAsync(client, "INV-SMALL", unitPrice: 10);
        await CreateEstimateAsync(client, "EST-BIG", unitPrice: 5000);

        var highest = await ListAsync(client, "?sort=AmountHighest");
        var lowest = await ListAsync(client, "?sort=AmountLowest");

        Assert.Equal("EST-BIG", highest.Items[0].DocumentNumber);
        Assert.Equal("INV-SMALL", lowest.Items[0].DocumentNumber);
    }

    [Fact]
    public async Task Pages_across_the_combined_set()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-paging@example.com");
        await SeedOneOfEachAsync(client);

        var first = await ListAsync(client, "?page=1&pageSize=2");
        var second = await ListAsync(client, "?page=2&pageSize=2");
        var third = await ListAsync(client, "?page=3&pageSize=2");

        Assert.Equal(5, first.TotalCount);
        Assert.Equal(2, first.Items.Count);
        Assert.Equal(2, second.Items.Count);
        Assert.Single(third.Items);

        // No document may appear on two pages - the thing an unstable sort silently breaks.
        var seen = first.Items.Concat(second.Items).Concat(third.Items).Select(item => item.Id).ToList();
        Assert.Equal(5, seen.Distinct().Count());
    }

    [Fact]
    public async Task Excludes_a_soft_deleted_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-deleted@example.com");
        var invoiceId = await CreateInvoiceAsync(client, "INV-GONE");

        var before = await ListAsync(client);
        await client.DeleteAsync($"/api/v1/invoices/{invoiceId}");
        var after = await ListAsync(client);

        Assert.Equal(1, before.TotalCount);
        Assert.Equal(0, after.TotalCount);
    }

    [Fact]
    public async Task Never_returns_another_accounts_documents()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var ownerClient = await RegisteredClientAsync(factory, "doc-owner@example.com");
        await SeedOneOfEachAsync(ownerClient);

        using var otherClient = await RegisteredClientAsync(factory, "doc-other@example.com");
        await CreateInvoiceAsync(otherClient, "INV-OTHER", customer: "Other Co");

        var otherResult = await ListAsync(otherClient);

        var item = Assert.Single(otherResult.Items);
        Assert.Equal("INV-OTHER", item.DocumentNumber);
        Assert.Equal(1, otherResult.TotalCount);
    }

    [Fact]
    public async Task Caps_the_page_size_and_falls_back_on_an_out_of_range_value()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-pagesize@example.com");
        await CreateInvoiceAsync(client, "INV-1");

        var tooLarge = await ListAsync(client, "?pageSize=5000");
        var negative = await ListAsync(client, "?pageSize=-3");

        Assert.Equal(25, tooLarge.PageSize);
        Assert.Equal(25, negative.PageSize);
    }

    [Fact]
    public async Task Rejects_an_unknown_document_type()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-bad-type@example.com");

        var response = await client.GetAsync($"{Endpoint}?documentType=Nonsense");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>The existing invoice-only list must be untouched by any of this (IG-237's third AC).</summary>
    [Fact]
    public async Task Leaves_the_invoice_only_list_unchanged()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "doc-invoice-list@example.com");
        await SeedOneOfEachAsync(client);

        var invoiceList = await client.GetFromJsonAsync<InvoiceListResponse>("/api/v1/invoices", JsonOptions);

        Assert.Equal(1, invoiceList!.TotalCount);
        Assert.Equal("INV-DOC-1", invoiceList.Items[0].InvoiceNumber);
    }
}
