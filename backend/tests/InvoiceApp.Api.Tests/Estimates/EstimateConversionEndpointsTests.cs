using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Estimates;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Estimates;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Api.Tests.Estimates;

/// <summary>IG-266 (Test conversion data integrity and traceability, subtask of IG-223): the
/// estimate records the invoice it was converted into, and only an accepted estimate converts.
/// Concurrency (two conversions racing) needs real Postgres and lives in
/// EstimateConversionConcurrencyTests in the Infrastructure test project.</summary>
public class EstimateConversionEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static EstimateSaveRequest ValidRequest(string estimateNumber) => new(
        EstimateNumber: estimateNumber,
        IssueDate: DateOnly.Parse("2030-01-01"),
        ExpiryDate: DateOnly.Parse("2030-01-16"),
        Reference: "PO-7",
        Currency: "AUD",
        Seller: "My Business",
        Customer: "Acme Pty Ltd\n123 Main St",
        ShipTo: null,
        Items: [new EstimateSaveLineItem("Consulting", 2, "Hour", 100, 10, 5)],
        DiscountType: DiscountType.None,
        DiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: null,
        Terms: null,
        CustomInstructions: null,
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    private static InvoiceEmailRequest EmailRequest() => new(["customer@example.com"], [], "Estimate", "Please review.");

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<EstimateDto> CreateDraftAsync(HttpClient client, string estimateNumber)
    {
        var response = await client.PostAsJsonAsync(await DefaultBusinessRoutes.RouteAsync(client, "/estimates"), ValidRequest(estimateNumber));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<EstimateDto>(JsonOptions))!;
    }

    private static async Task SendAsync(HttpClient client, Guid estimateId)
    {
        var response = await client.PostAsJsonAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/estimates")}/{estimateId}/send-email", EmailRequest());
        response.EnsureSuccessStatusCode();
    }

    private static async Task<string> PublicTokenAsync(AuthenticatedRouteTestFactory factory, Guid estimateId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return (await db.Estimates.SingleAsync(e => e.Id == estimateId)).PublicToken!;
    }

    private static async Task AcceptAsync(AuthenticatedRouteTestFactory factory, Guid estimateId)
    {
        using var anonymousClient = factory.CreateClient();
        var token = await PublicTokenAsync(factory, estimateId);
        var response = await anonymousClient.PostAsync($"/api/v1/public/estimates/{token}/accept", null);
        response.EnsureSuccessStatusCode();
    }

    private static async Task<HttpResponseMessage> ConvertAsync(HttpClient client, Guid estimateId)
        => await client.PostAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/estimates")}/{estimateId}/convert-to-invoice", null);

    private static async Task<EstimateDetailDto> GetDetailAsync(HttpClient client, Guid estimateId)
    {
        var response = await client.GetAsync($"{await DefaultBusinessRoutes.RouteAsync(client, "/estimates")}/{estimateId}");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<EstimateDetailDto>(JsonOptions))!;
    }

    private static async Task<int> InvoiceCountAsync(AuthenticatedRouteTestFactory factory, Guid businessId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.Invoices.CountAsync(i => i.BusinessId == businessId);
    }

    private static async Task<Guid> BusinessIdAsync(AuthenticatedRouteTestFactory factory, Guid estimateId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return (await db.Estimates.SingleAsync(e => e.Id == estimateId)).BusinessId;
    }

    [Fact]
    public async Task Converting_an_accepted_estimate_records_the_invoice_it_became()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "convert-accepted@example.com");
        var estimate = await CreateDraftAsync(client, "EST-CONV-1");
        await SendAsync(client, estimate.Id);
        await AcceptAsync(factory, estimate.Id);

        var response = await ConvertAsync(client, estimate.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var invoiceId = (await response.Content.ReadFromJsonAsync<ConvertResponse>(JsonOptions))!.InvoiceId;

        var detail = await GetDetailAsync(client, estimate.Id);
        Assert.Equal(EstimateStatus.Converted, detail.Status);
        Assert.Equal(invoiceId, detail.ConvertedInvoiceId);

        var businessId = await BusinessIdAsync(factory, estimate.Id);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.True(await db.Invoices.AnyAsync(i => i.Id == invoiceId && i.BusinessId == businessId));
    }

    [Fact]
    public async Task A_draft_estimate_cannot_be_converted_and_names_no_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "convert-draft@example.com");
        var estimate = await CreateDraftAsync(client, "EST-CONV-2");
        var businessId = await BusinessIdAsync(factory, estimate.Id);

        var response = await ConvertAsync(client, estimate.Id);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var detail = await GetDetailAsync(client, estimate.Id);
        Assert.Equal(EstimateStatus.Draft, detail.Status);
        Assert.Null(detail.ConvertedInvoiceId);
        Assert.Equal(0, await InvoiceCountAsync(factory, businessId));
    }

    [Fact]
    public async Task A_sent_but_not_accepted_estimate_cannot_be_converted()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "convert-sent@example.com");
        var estimate = await CreateDraftAsync(client, "EST-CONV-3");
        await SendAsync(client, estimate.Id);
        var businessId = await BusinessIdAsync(factory, estimate.Id);

        var response = await ConvertAsync(client, estimate.Id);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var detail = await GetDetailAsync(client, estimate.Id);
        Assert.Equal(EstimateStatus.Sent, detail.Status);
        Assert.Null(detail.ConvertedInvoiceId);
        Assert.Equal(0, await InvoiceCountAsync(factory, businessId));
    }

    [Fact]
    public async Task Converting_the_same_estimate_twice_creates_one_invoice_and_keeps_the_first_link()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "convert-twice@example.com");
        var estimate = await CreateDraftAsync(client, "EST-CONV-4");
        await SendAsync(client, estimate.Id);
        await AcceptAsync(factory, estimate.Id);
        var businessId = await BusinessIdAsync(factory, estimate.Id);

        var first = await ConvertAsync(client, estimate.Id);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var firstInvoiceId = (await first.Content.ReadFromJsonAsync<ConvertResponse>(JsonOptions))!.InvoiceId;

        var second = await ConvertAsync(client, estimate.Id);

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal(1, await InvoiceCountAsync(factory, businessId));
        var detail = await GetDetailAsync(client, estimate.Id);
        Assert.Equal(firstInvoiceId, detail.ConvertedInvoiceId);
    }

    private sealed record ConvertResponse(Guid InvoiceId);
}
