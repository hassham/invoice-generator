using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Api.Tests.Invoicing;

/// <summary>
/// Verifies IG-234's amount-validation acceptance criterion at the real HTTP pipeline level, and
/// pins the credit note numbering fix: the sequence previously counted only live rows, so deleting
/// a credit note handed its number straight to the next one and a single accounting number pointed
/// at two documents. There is now a unique (business_id, credit_note_number) index behind it.
/// </summary>
public class CreditNoteEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static string Endpoint(Guid businessId) => $"/api/v1/businesses/{businessId}/credit-notes";

    private static InvoiceSaveRequest InvoiceRequest(string invoiceNumber) => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: new DateOnly(2030, 8, 1),
        DueDate: new DateOnly(2030, 8, 15),
        Reference: null,
        Currency: "AUD",
        Seller: "My Business",
        Customer: "Acme Pty Ltd",
        ShipTo: null,
        // 1 x 100, no tax or discount -> TotalAmount and AmountDue are exactly 100.
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

    private static async Task<Guid> InvoiceIdAsync(HttpClient client, string invoiceNumber = "INV-CN-1")
    {
        var response = await client.PostAsJsonAsync("/api/v1/invoices", InvoiceRequest(invoiceNumber));
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions);
        return created!.Id;
    }

    private static async Task<CreditNoteDto> CreateAsync(HttpClient client, Guid businessId, Guid invoiceId, decimal amount)
    {
        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            new CreateCreditNoteCommand(invoiceId, amount, "Returned goods", null));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CreditNoteDto>(JsonOptions))!;
    }

    [Fact]
    public async Task Missing_session_cannot_create_a_credit_note()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(Endpoint(Guid.NewGuid()),
            new CreateCreditNoteCommand(Guid.NewGuid(), 10m, "Returned goods", null));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Creates_a_credit_note_against_an_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cn-create@example.com");
        var businessId = await BusinessIdAsync(client);
        var invoiceId = await InvoiceIdAsync(client);

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            new CreateCreditNoteCommand(invoiceId, 40m, "Returned goods", "Two units"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CreditNoteDto>(JsonOptions);
        Assert.Equal(40m, created!.Amount);
        Assert.Equal("Returned goods", created.Reason);
        Assert.Equal(invoiceId, created.InvoiceId);
        Assert.StartsWith("CN-", created.CreditNoteNumber);
    }

    // IG-288's completion criterion.
    [Fact]
    public async Task Rejects_a_credit_note_larger_than_the_invoice_amount_due()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cn-too-big@example.com");
        var businessId = await BusinessIdAsync(client);
        var invoiceId = await InvoiceIdAsync(client);

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            new CreateCreditNoteCommand(invoiceId, 100.01m, "Returned goods", null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("cannot exceed", body);
    }

    [Fact]
    public async Task Accepts_a_credit_note_for_exactly_the_invoice_amount_due()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cn-exact@example.com");
        var businessId = await BusinessIdAsync(client);
        var invoiceId = await InvoiceIdAsync(client);

        var created = await CreateAsync(client, businessId, invoiceId, 100m);

        Assert.Equal(100m, created.Amount);
    }

    [Fact]
    public async Task Rejects_a_credit_note_against_an_unknown_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cn-no-invoice@example.com");
        var businessId = await BusinessIdAsync(client);

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            new CreateCreditNoteCommand(Guid.NewGuid(), 10m, "Returned goods", null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Numbers_credit_notes_sequentially()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cn-sequence@example.com");
        var businessId = await BusinessIdAsync(client);
        var invoiceId = await InvoiceIdAsync(client);

        var first = await CreateAsync(client, businessId, invoiceId, 10m);
        var second = await CreateAsync(client, businessId, invoiceId, 10m);

        Assert.EndsWith("0001", first.CreditNoteNumber);
        Assert.EndsWith("0002", second.CreditNoteNumber);
        Assert.NotEqual(first.CreditNoteNumber, second.CreditNoteNumber);
    }

    /// <summary>
    /// The regression this fix is about: the old sequence counted only rows where IsDeleted was
    /// false, so deleting a credit note reissued its number to the next one.
    /// </summary>
    [Fact]
    public async Task Does_not_reuse_the_number_of_a_deleted_credit_note()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cn-no-reuse@example.com");
        var businessId = await BusinessIdAsync(client);
        var invoiceId = await InvoiceIdAsync(client);

        var first = await CreateAsync(client, businessId, invoiceId, 10m);
        var deleteResponse = await client.DeleteAsync($"{Endpoint(businessId)}/{first.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var second = await CreateAsync(client, businessId, invoiceId, 10m);

        Assert.NotEqual(first.CreditNoteNumber, second.CreditNoteNumber);
        Assert.EndsWith("0002", second.CreditNoteNumber);
    }

    [Fact]
    public async Task Deleting_a_credit_note_removes_it_from_the_list()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cn-delete@example.com");
        var businessId = await BusinessIdAsync(client);
        var invoiceId = await InvoiceIdAsync(client);
        var created = await CreateAsync(client, businessId, invoiceId, 10m);

        await client.DeleteAsync($"{Endpoint(businessId)}/{created.Id}");

        var listed = await client.GetFromJsonAsync<List<CreditNoteDto>>(Endpoint(businessId), JsonOptions);
        Assert.Empty(listed!);
    }

    // IG-308 / IG-234 AC 1: the credit note must render through the shared document engine.
    [Fact]
    public async Task Renders_a_credit_note_as_a_pdf()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cn-pdf@example.com");
        var businessId = await BusinessIdAsync(client);
        var invoiceId = await InvoiceIdAsync(client);
        var created = await CreateAsync(client, businessId, invoiceId, 40m);

        var response = await client.GetAsync($"{Endpoint(businessId)}/{created.Id}/pdf");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        // Magic bytes only - this test cannot see rendered text. That the document actually reads
        // "CREDIT NOTE" is proven by extracting the text with pdftotext, the IG-306 precedent.
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(bytes, 0, 4));
        Assert.Contains(created.CreditNoteNumber, response.Content.Headers.ContentDisposition?.FileNameStar ?? response.Content.Headers.ContentDisposition?.FileName ?? string.Empty);
    }

    [Fact]
    public async Task Missing_session_cannot_download_a_credit_note_pdf()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"{Endpoint(Guid.NewGuid())}/{Guid.NewGuid()}/pdf");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_deleted_credit_note_has_no_pdf()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "cn-pdf-deleted@example.com");
        var businessId = await BusinessIdAsync(client);
        var invoiceId = await InvoiceIdAsync(client);
        var created = await CreateAsync(client, businessId, invoiceId, 10m);
        await client.DeleteAsync($"{Endpoint(businessId)}/{created.Id}");

        var response = await client.GetAsync($"{Endpoint(businessId)}/{created.Id}/pdf");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Cannot_download_another_accounts_credit_note_pdf()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var ownerClient = await RegisteredClientAsync(factory, "cn-pdf-owner@example.com");
        var ownerBusinessId = await BusinessIdAsync(ownerClient);
        var ownerInvoiceId = await InvoiceIdAsync(ownerClient);
        var created = await CreateAsync(ownerClient, ownerBusinessId, ownerInvoiceId, 10m);

        using var otherClient = await RegisteredClientAsync(factory, "cn-pdf-other@example.com");

        var response = await otherClient.GetAsync($"{Endpoint(ownerBusinessId)}/{created.Id}/pdf");

        Assert.NotEqual(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Lists_only_the_owning_accounts_credit_notes()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var ownerClient = await RegisteredClientAsync(factory, "cn-owner@example.com");
        var ownerBusinessId = await BusinessIdAsync(ownerClient);
        var ownerInvoiceId = await InvoiceIdAsync(ownerClient);
        await CreateAsync(ownerClient, ownerBusinessId, ownerInvoiceId, 10m);

        using var otherClient = await RegisteredClientAsync(factory, "cn-other@example.com");
        var otherBusinessId = await BusinessIdAsync(otherClient);

        var ownList = await otherClient.GetFromJsonAsync<List<CreditNoteDto>>(Endpoint(otherBusinessId), JsonOptions);
        Assert.Empty(ownList!);

        var crossResponse = await otherClient.GetAsync(Endpoint(ownerBusinessId));
        Assert.NotEqual(HttpStatusCode.OK, crossResponse.StatusCode);
    }
}
