using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Customers;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Api.Tests.Invoicing;

/// <summary>
/// IG-278: "Invalid frequency/date combinations (e.g. end date before start date) are rejected
/// with a clear error."
///
/// Recurring schedules had no test coverage at all, despite a daily background job generating real
/// invoices from them. These cover the create endpoint's validation at the HTTP level - a rejected
/// schedule has to come back as a 400 the UI can show, not a 500.
/// </summary>
public class RecurringScheduleEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static readonly DateOnly StartDate = new(2030, 8, 1);

    private static string Endpoint(Guid businessId) => $"/api/v1/businesses/{businessId}/recurring-schedules";

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

    private static async Task<Guid> CustomerIdAsync(HttpClient client, string name = "Acme Pty Ltd")
    {
        var response = await client.PostAsJsonAsync("/api/v1/customers", new CustomerRequest(
            name, "Jamie Lee", "billing@acme.example", null, null, null, null, null, null, null, null, null));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CustomerDto>(JsonOptions))!.Id;
    }

    private static async Task<Guid> TemplateInvoiceIdAsync(HttpClient client, string invoiceNumber = "INV-TPL-1")
    {
        var response = await client.PostAsJsonAsync("/api/v1/invoices", new InvoiceSaveRequest(
            InvoiceNumber: invoiceNumber,
            IssueDate: StartDate,
            DueDate: StartDate.AddDays(14),
            Reference: null,
            Currency: "AUD",
            Seller: "My Business",
            Customer: "Acme Pty Ltd",
            ShipTo: null,
            Items: [new InvoiceSaveLineItem("Retainer", 1, null, 500, 0, 0)],
            InvoiceDiscountType: DiscountType.None,
            InvoiceDiscountValue: null,
            TaxCalculationMethod: TaxCalculationMethod.Exclusive,
            Notes: null,
            Terms: null,
            CustomInstructions: null,
            PaymentInstructions: null,
            TemplateId: null,
            TemplateCustomization: null));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<InvoiceDto>(JsonOptions))!.Id;
    }

    private static CreateRecurringScheduleCommand Command(
        Guid customerId,
        Guid templateId,
        string frequency = "Monthly",
        DateOnly? startDate = null,
        DateOnly? endDate = null) =>
        new(customerId, templateId, frequency, startDate ?? StartDate, endDate, AutoSend: false);

    /// <summary>Registers an account and gives back everything a valid schedule needs.</summary>
    private static async Task<(HttpClient Client, Guid BusinessId, Guid CustomerId, Guid TemplateId)> ReadyAsync(
        AuthenticatedRouteTestFactory factory, string email)
    {
        var client = await RegisteredClientAsync(factory, email);
        var businessId = await BusinessIdAsync(client);
        var customerId = await CustomerIdAsync(client);
        var templateId = await TemplateInvoiceIdAsync(client);
        return (client, businessId, customerId, templateId);
    }

    [Fact]
    public async Task Missing_session_cannot_create_a_schedule()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(Endpoint(Guid.NewGuid()),
            Command(Guid.NewGuid(), Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>The control: without this, every rejection test below could pass vacuously.</summary>
    [Fact]
    public async Task Creates_a_schedule_from_a_template_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, templateId) = await ReadyAsync(factory, "sched-create@example.com");
        using var _ = client;

        var response = await client.PostAsJsonAsync(Endpoint(businessId), Command(customerId, templateId));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<RecurringScheduleDto>(JsonOptions);
        Assert.Equal(customerId, created!.CustomerId);
        Assert.Equal(templateId, created.InvoiceTemplateId);
        Assert.Equal(StartDate, created.StartDate);
        // The first run is the start date itself, not a period after it.
        Assert.Equal(StartDate, created.NextRunDate);
        Assert.Null(created.EndDate);
    }

    // IG-278's named example.
    [Fact]
    public async Task Rejects_an_end_date_before_the_start_date()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, templateId) = await ReadyAsync(factory, "sched-bad-dates@example.com");
        using var _ = client;

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            Command(customerId, templateId, endDate: StartDate.AddDays(-1)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("End date must be after start date", await response.Content.ReadAsStringAsync());
    }

    /// <summary>
    /// A schedule that starts and ends on the same day would generate once and never again, which
    /// is a one-off invoice, not a recurring schedule.
    /// </summary>
    [Fact]
    public async Task Rejects_an_end_date_equal_to_the_start_date()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, templateId) = await ReadyAsync(factory, "sched-same-date@example.com");
        using var _ = client;

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            Command(customerId, templateId, endDate: StartDate));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Accepts_an_end_date_after_the_start_date()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, templateId) = await ReadyAsync(factory, "sched-good-dates@example.com");
        using var _ = client;

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            Command(customerId, templateId, endDate: StartDate.AddMonths(6)));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<RecurringScheduleDto>(JsonOptions);
        Assert.Equal(StartDate.AddMonths(6), created!.EndDate);
    }

    /// <summary>IG-229 AC 2: the end date is optional, so an open-ended schedule must be accepted.</summary>
    [Fact]
    public async Task Accepts_a_schedule_with_no_end_date()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, templateId) = await ReadyAsync(factory, "sched-open-ended@example.com");
        using var _ = client;

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            Command(customerId, templateId, endDate: null));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    /// <summary>IG-229 AC 1: every advertised frequency must actually be accepted.</summary>
    [Theory]
    [InlineData("Weekly")]
    [InlineData("Fortnightly")]
    [InlineData("Monthly")]
    [InlineData("Quarterly")]
    [InlineData("Annually")]
    [InlineData("Custom")]
    public async Task Accepts_every_advertised_frequency(string frequency)
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, templateId) = await ReadyAsync(factory, $"sched-freq-{frequency}@example.com");
        using var _ = client;

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            Command(customerId, templateId, frequency));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Theory]
    [InlineData("monthly")]
    [InlineData("MONTHLY")]
    public async Task Accepts_a_frequency_whatever_its_casing(string frequency)
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, templateId) = await ReadyAsync(factory, $"sched-case-{frequency}@example.com");
        using var _ = client;

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            Command(customerId, templateId, frequency));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Theory]
    [InlineData("Daily")]
    [InlineData("")]
    [InlineData("every other tuesday")]
    public async Task Rejects_a_frequency_it_does_not_support(string frequency)
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, templateId) = await ReadyAsync(factory, $"sched-badfreq-{frequency.Length}@example.com");
        using var _ = client;

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            Command(customerId, templateId, frequency));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Invalid frequency", await response.Content.ReadAsStringAsync());
    }

    /// <summary>
    /// A numeric string must not sneak through. Enum.TryParse accepts the underlying value, so
    /// "3" silently became Monthly, and "99" was worse still: TryParse succeeds for an undefined
    /// number, so a schedule could be stored with a frequency that is not a real option and
    /// CalculateNextRunDate would quietly fall through to its monthly default.
    /// </summary>
    [Theory]
    [InlineData("3")]
    [InlineData("99")]
    [InlineData("-1")]
    public async Task Rejects_a_numeric_frequency(string frequency)
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, templateId) = await ReadyAsync(factory, $"sched-numeric-{frequency}@example.com");
        using var _ = client;

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            Command(customerId, templateId, frequency));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Invalid frequency", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Rejects_an_unknown_customer()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, _, templateId) = await ReadyAsync(factory, "sched-no-customer@example.com");
        using var _c = client;

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            Command(Guid.NewGuid(), templateId));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Customer not found", await response.Content.ReadAsStringAsync());
    }

    /// <summary>An archived customer should not be signed up to a new recurring commitment.</summary>
    [Fact]
    public async Task Rejects_an_archived_customer()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, templateId) = await ReadyAsync(factory, "sched-archived@example.com");
        using var _ = client;
        await client.DeleteAsync($"/api/v1/customers/{customerId}");

        var response = await client.PostAsJsonAsync(Endpoint(businessId), Command(customerId, templateId));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Customer not found", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Rejects_an_unknown_template_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, _) = await ReadyAsync(factory, "sched-no-template@example.com");
        using var _c = client;

        var response = await client.PostAsJsonAsync(Endpoint(businessId),
            Command(customerId, Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Invoice template not found", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Rejects_a_deleted_template_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        var (client, businessId, customerId, templateId) = await ReadyAsync(factory, "sched-deleted-template@example.com");
        using var _ = client;
        await client.DeleteAsync($"/api/v1/invoices/{templateId}");

        var response = await client.PostAsJsonAsync(Endpoint(businessId), Command(customerId, templateId));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>Account isolation: another account's invoice is not a usable template.</summary>
    [Fact]
    public async Task Rejects_another_accounts_template_invoice()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        var (ownerClient, _, _, ownerTemplateId) = await ReadyAsync(factory, "sched-owner@example.com");
        using var _o = ownerClient;

        var (otherClient, otherBusinessId, otherCustomerId, _) = await ReadyAsync(factory, "sched-other@example.com");
        using var _t = otherClient;

        var response = await otherClient.PostAsJsonAsync(Endpoint(otherBusinessId),
            Command(otherCustomerId, ownerTemplateId));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Invoice template not found", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Rejects_another_accounts_customer()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        var (ownerClient, _, ownerCustomerId, _) = await ReadyAsync(factory, "sched-owner-cust@example.com");
        using var _o = ownerClient;

        var (otherClient, otherBusinessId, _, otherTemplateId) = await ReadyAsync(factory, "sched-other-cust@example.com");
        using var _t = otherClient;

        var response = await otherClient.PostAsJsonAsync(Endpoint(otherBusinessId),
            Command(ownerCustomerId, otherTemplateId));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Customer not found", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Cannot_create_a_schedule_under_another_accounts_business()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        var (ownerClient, ownerBusinessId, _, _) = await ReadyAsync(factory, "sched-biz-owner@example.com");
        using var _o = ownerClient;

        var (otherClient, _, otherCustomerId, otherTemplateId) = await ReadyAsync(factory, "sched-biz-other@example.com");
        using var _t = otherClient;

        var response = await otherClient.PostAsJsonAsync(Endpoint(ownerBusinessId),
            Command(otherCustomerId, otherTemplateId));

        Assert.NotEqual(HttpStatusCode.Created, response.StatusCode);
        Assert.Contains("Business not found", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Lists_only_the_owning_accounts_schedules()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        var (ownerClient, ownerBusinessId, ownerCustomerId, ownerTemplateId) =
            await ReadyAsync(factory, "sched-list-owner@example.com");
        using var _o = ownerClient;
        await ownerClient.PostAsJsonAsync(Endpoint(ownerBusinessId), Command(ownerCustomerId, ownerTemplateId));

        var (otherClient, otherBusinessId, _, _) = await ReadyAsync(factory, "sched-list-other@example.com");
        using var _t = otherClient;

        var own = await otherClient.GetFromJsonAsync<List<RecurringScheduleDto>>(Endpoint(otherBusinessId), JsonOptions);
        Assert.Empty(own!);
    }
}
