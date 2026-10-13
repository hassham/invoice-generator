using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Api.Tests.Invoicing;

/// <summary>IG-246 (Test delivery/opened status tracking): a sent invoice email carries a tracking pixel; loading
/// it records the open on that email's history row. Failed sends are never shown as opened, and an unknown
/// pixel token changes nothing.</summary>
public class InvoiceEmailOpenTrackingTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static InvoiceSaveRequest ValidRequest(string invoiceNumber) => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: DateOnly.Parse("2030-01-01"),
        DueDate: DateOnly.Parse("2030-01-16"),
        Reference: null,
        Currency: "AUD",
        Seller: "My Business",
        Customer: "Acme Pty Ltd\n123 Main St",
        ShipTo: null,
        Items: [new InvoiceSaveLineItem("Consulting", 1, "Hour", 100, 10, 0)],
        InvoiceDiscountType: DiscountType.None,
        InvoiceDiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: null,
        Terms: null,
        CustomInstructions: null,
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    private static InvoiceEmailRequest EmailRequest() => new(
        To: ["customer@example.com"],
        Cc: [],
        Subject: "Invoice from My Business",
        Message: "Please find your invoice attached.");

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> CreateInvoiceAsync(HttpClient client, string number)
    {
        var response = await client.PostAsJsonAsync(await DefaultBusinessRoutes.InvoicesRouteAsync(client), ValidRequest(number));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions))!.Id;
    }

    private static string PixelTokenFromLatestEmail(AuthenticatedRouteTestFactory factory)
    {
        var html = factory.InvoiceEmailSender.SentMessages.Last().HtmlBody;
        return Regex.Match(html, @"/api/v1/public/email-opens/([A-Za-z0-9_\-]+)").Groups[1].Value;
    }

    private static async Task<List<EmailHistoryView>> HistoryAsync(HttpClient client, Guid invoiceId)
    {
        var response = await client.GetAsync($"{await DefaultBusinessRoutes.InvoicesRouteAsync(client)}/{invoiceId}/email-history");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<List<EmailHistoryView>>(JsonOptions))!;
    }

    private sealed record EmailHistoryView(Guid Id, DateTimeOffset SentAt, List<string> To, List<string> Cc, string Subject, InvoiceEmailStatus Status, DateTimeOffset? OpenedAt, int OpenCount);

    [Fact]
    public async Task A_sent_email_embeds_a_tracking_pixel_and_opening_it_is_recorded_on_its_history_row()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "open-track-sent@example.com");
        var invoiceId = await CreateInvoiceAsync(client, "INV-OPEN-1");
        await client.PostAsJsonAsync($"{await DefaultBusinessRoutes.InvoicesRouteAsync(client)}/{invoiceId}/send-email", EmailRequest());
        var token = PixelTokenFromLatestEmail(factory);
        Assert.False(string.IsNullOrEmpty(token));

        var before = Assert.Single(await HistoryAsync(client, invoiceId));
        Assert.Null(before.OpenedAt);
        Assert.Equal(0, before.OpenCount);

        using var anonymous = factory.CreateClient();
        var pixel = await anonymous.GetAsync($"/api/v1/public/email-opens/{token}");

        Assert.Equal(HttpStatusCode.OK, pixel.StatusCode);
        Assert.Equal("image/gif", pixel.Content.Headers.ContentType?.MediaType);
        var after = Assert.Single(await HistoryAsync(client, invoiceId));
        Assert.NotNull(after.OpenedAt);
        Assert.Equal(1, after.OpenCount);
    }

    [Fact]
    public async Task Repeat_opens_count_up_but_keep_the_first_open_time()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "open-track-repeat@example.com");
        var invoiceId = await CreateInvoiceAsync(client, "INV-OPEN-2");
        await client.PostAsJsonAsync($"{await DefaultBusinessRoutes.InvoicesRouteAsync(client)}/{invoiceId}/send-email", EmailRequest());
        var token = PixelTokenFromLatestEmail(factory);
        using var anonymous = factory.CreateClient();

        await anonymous.GetAsync($"/api/v1/public/email-opens/{token}");
        var first = Assert.Single(await HistoryAsync(client, invoiceId)).OpenedAt;
        await anonymous.GetAsync($"/api/v1/public/email-opens/{token}");

        var row = Assert.Single(await HistoryAsync(client, invoiceId));
        Assert.Equal(2, row.OpenCount);
        Assert.Equal(first, row.OpenedAt);
    }

    [Fact]
    public async Task An_unknown_token_still_returns_the_pixel_and_changes_nothing()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "open-track-unknown@example.com");
        var invoiceId = await CreateInvoiceAsync(client, "INV-OPEN-3");
        await client.PostAsJsonAsync($"{await DefaultBusinessRoutes.InvoicesRouteAsync(client)}/{invoiceId}/send-email", EmailRequest());
        using var anonymous = factory.CreateClient();

        var response = await anonymous.GetAsync("/api/v1/public/email-opens/not-a-real-token");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/gif", response.Content.Headers.ContentType?.MediaType);
        var row = Assert.Single(await HistoryAsync(client, invoiceId));
        Assert.Null(row.OpenedAt);
        Assert.Equal(0, row.OpenCount);
    }

    [Fact]
    public async Task A_failed_send_is_shown_as_failed_and_never_as_opened()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "open-track-failed@example.com");
        var invoiceId = await CreateInvoiceAsync(client, "INV-OPEN-4");
        factory.InvoiceEmailSender.ThrowOnSend = new InvalidOperationException("SMTP connection refused");
        await client.PostAsJsonAsync($"{await DefaultBusinessRoutes.InvoicesRouteAsync(client)}/{invoiceId}/send-email", EmailRequest());

        var row = Assert.Single(await HistoryAsync(client, invoiceId));
        Assert.Equal(InvoiceEmailStatus.Failed, row.Status);
        Assert.Null(row.OpenedAt);
        Assert.Equal(0, row.OpenCount);
    }
}
