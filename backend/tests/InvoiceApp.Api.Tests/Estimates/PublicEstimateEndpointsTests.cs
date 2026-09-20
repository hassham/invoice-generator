using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Estimates;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Api.Tests.Estimates;

/// <summary>Verifies IG-221's hosted estimate page endpoints - mirrors PublicInvoiceEndpointsTests
/// exactly for the new entity: anonymous access via a real token, generic 404 for anything else.</summary>
public class PublicEstimateEndpointsTests
{
    private const string EstimatesEndpoint = "/api/v1/estimates";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static EstimateSaveRequest ValidRequest(string estimateNumber) => new(
        EstimateNumber: estimateNumber,
        IssueDate: DateOnly.Parse("2030-01-01"),
        ExpiryDate: DateOnly.Parse("2030-01-16"),
        Reference: "PO-42",
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

    /// <summary>Sending is what generates the public token (IG-220 doesn't tokenize at creation,
    /// unlike Invoice - see EstimateService.PrepareEstimateEmailAsync's own doc comment), so the
    /// hosted-page tests send first to get a real one.</summary>
    private static async Task<string> CreateAndSendGetTokenAsync(AuthenticatedRouteTestFactory factory, HttpClient client, string estimateNumber)
    {
        var created = await (await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest(estimateNumber))).Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);
        await client.PostAsJsonAsync($"{EstimatesEndpoint}/{created!.Id}/send-email", EmailRequest());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return (await db.Estimates.SingleAsync(e => e.Id == created.Id)).PublicToken!;
    }

    [Fact]
    public async Task Anonymous_visitor_can_view_the_hosted_estimate_by_its_token()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "hosted-estimate-view@example.com");
        var token = await CreateAndSendGetTokenAsync(factory, client, "EST-HOSTED-1");

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.GetAsync($"/api/v1/public/estimates/{token}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var hosted = await response.Content.ReadFromJsonAsync<HostedEstimateDto>(JsonOptions);
        Assert.Equal("EST-HOSTED-1", hosted!.EstimateNumber);
        Assert.Equal("AUD", hosted.Currency);
        Assert.True(hosted.TotalAmount > 0);
    }

    [Fact]
    public async Task Unknown_token_returns_a_generic_not_found()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.GetAsync("/api/v1/public/estimates/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_visitor_can_download_the_hosted_estimate_pdf()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "hosted-estimate-pdf@example.com");
        var token = await CreateAndSendGetTokenAsync(factory, client, "EST-HOSTED-2");

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.GetAsync($"/api/v1/public/estimates/{token}/pdf");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("Estimate-EST-HOSTED-2.pdf", response.Content.Headers.ContentDisposition?.FileName);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0);
    }

    [Fact]
    public async Task Unknown_token_pdf_download_also_returns_a_generic_not_found()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.GetAsync("/api/v1/public/estimates/does-not-exist/pdf");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
