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

/// <summary>Verifies IG-221's send-by-email endpoint and IG-262's status-transition AC: the PDF is
/// attached labelled "Estimate", the hosted /e/ link is included, sending transitions Draft -&gt;
/// Sent exactly once, and account-ownership/validation are both enforced - mirrors
/// InvoiceSendEmailEndpointTests/InvoiceEmailHistoryEndpointTests exactly for the new entity.</summary>
public class EstimateSendEmailEndpointTests
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
        Notes: "Thanks for your interest",
        Terms: null,
        CustomInstructions: "Valid for 14 days",
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    private static InvoiceEmailRequest EmailRequest() => new(
        To: ["customer@example.com"],
        Cc: ["accounts@example.com"],
        Subject: "Estimate from My Business",
        Message: "Please find your estimate attached.");

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<List<InvoiceEmailLogDto>> GetHistoryAsync(HttpClient client, Guid estimateId)
    {
        var response = await client.GetAsync($"{EstimatesEndpoint}/{estimateId}/email-history");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<List<InvoiceEmailLogDto>>(JsonOptions))!;
    }

    [Fact]
    public async Task Sending_a_valid_estimate_attaches_the_pdf_includes_the_hosted_link_and_transitions_status_to_sent()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-send-valid@example.com");
        var created = await (await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest("EST-EMAIL-1"))).Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);
        Assert.Equal(EstimateStatus.Draft, created!.Status);

        var response = await client.PostAsJsonAsync($"{EstimatesEndpoint}/{created.Id}/send-email", EmailRequest());

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var sent = Assert.Single(factory.InvoiceEmailSender.SentMessages);
        Assert.Equal(["customer@example.com"], sent.To);
        var attachment = Assert.Single(sent.Attachments);
        Assert.Equal("application/pdf", attachment.ContentType);
        Assert.StartsWith("Estimate-", attachment.FileName);
        Assert.Contains("View your estimate online", sent.PlainTextBody);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var estimate = await db.Estimates.SingleAsync(e => e.Id == created.Id);
        Assert.Contains($"/e/{estimate.PublicToken}", sent.PlainTextBody);
        Assert.Equal(EstimateStatus.Sent, estimate.Status);
    }

    [Fact]
    public async Task Resending_an_already_sent_estimate_does_not_regress_or_re_transition_status()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-resend@example.com");
        var created = await (await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest("EST-EMAIL-2"))).Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);
        await client.PostAsJsonAsync($"{EstimatesEndpoint}/{created!.Id}/send-email", EmailRequest());

        await client.PostAsJsonAsync($"{EstimatesEndpoint}/{created.Id}/send-email", EmailRequest() with { Subject = "Resend" });

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var estimate = await db.Estimates.SingleAsync(e => e.Id == created.Id);
        Assert.Equal(EstimateStatus.Sent, estimate.Status);
        Assert.Equal(2, factory.InvoiceEmailSender.SentMessages.Count);
    }

    [Fact]
    public async Task A_failed_send_never_transitions_status_to_sent()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-send-fail@example.com");
        var created = await (await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest("EST-EMAIL-3"))).Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);
        factory.InvoiceEmailSender.ThrowOnSend = new InvalidOperationException("SMTP connection refused");

        var response = await client.PostAsJsonAsync($"{EstimatesEndpoint}/{created!.Id}/send-email", EmailRequest());

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var estimate = await db.Estimates.SingleAsync(e => e.Id == created.Id);
        Assert.Equal(EstimateStatus.Draft, estimate.Status);

        var history = await GetHistoryAsync(client, created.Id);
        var entry = Assert.Single(history);
        Assert.Equal(InvoiceEmailStatus.Failed, entry.Status);
    }

    [Fact]
    public async Task Sending_without_a_session_is_unauthorized()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.PostAsJsonAsync($"{EstimatesEndpoint}/{Guid.NewGuid()}/send-email", EmailRequest());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(factory.InvoiceEmailSender.SentMessages);
    }

    [Fact]
    public async Task Sending_someone_elses_estimate_404s_and_sends_nothing()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "estimate-send-owner@example.com");
        var created = await (await ownerClient.PostAsJsonAsync(EstimatesEndpoint, ValidRequest("EST-EMAIL-4"))).Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);
        using var otherClient = await RegisteredClientAsync(factory, "estimate-send-other@example.com");

        var response = await otherClient.PostAsJsonAsync($"{EstimatesEndpoint}/{created!.Id}/send-email", EmailRequest());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Empty(factory.InvoiceEmailSender.SentMessages);
    }

    [Fact]
    public async Task Rejects_a_request_with_no_recipients_and_sends_nothing()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-send-invalid@example.com");
        var created = await (await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest("EST-EMAIL-5"))).Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);

        var response = await client.PostAsJsonAsync($"{EstimatesEndpoint}/{created!.Id}/send-email", EmailRequest() with { To = [] });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.InvoiceEmailSender.SentMessages);
    }

    [Fact]
    public async Task Email_history_is_empty_for_an_estimate_that_has_never_been_emailed()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-history-empty@example.com");
        var created = await (await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest("EST-HIST-1"))).Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);

        var history = await GetHistoryAsync(client, created!.Id);

        Assert.Empty(history);
    }

    [Fact]
    public async Task Email_history_accumulates_multiple_sends_newest_first()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "estimate-history-multiple@example.com");
        var created = await (await client.PostAsJsonAsync(EstimatesEndpoint, ValidRequest("EST-HIST-2"))).Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);

        await client.PostAsJsonAsync($"{EstimatesEndpoint}/{created!.Id}/send-email", EmailRequest());
        await client.PostAsJsonAsync($"{EstimatesEndpoint}/{created.Id}/send-email", EmailRequest() with { Subject = "Second send" });

        var history = await GetHistoryAsync(client, created.Id);

        Assert.Equal(2, history.Count);
        Assert.Equal("Second send", history[0].Subject);
    }

    [Fact]
    public async Task Email_history_requires_a_session()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.GetAsync($"{EstimatesEndpoint}/{Guid.NewGuid()}/email-history");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Someone_elses_estimate_email_history_404s()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var ownerClient = await RegisteredClientAsync(factory, "estimate-history-owner@example.com");
        var created = await (await ownerClient.PostAsJsonAsync(EstimatesEndpoint, ValidRequest("EST-HIST-3"))).Content.ReadFromJsonAsync<EstimateDto>(JsonOptions);
        using var otherClient = await RegisteredClientAsync(factory, "estimate-history-other@example.com");

        var response = await otherClient.GetAsync($"{EstimatesEndpoint}/{created!.Id}/email-history");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
