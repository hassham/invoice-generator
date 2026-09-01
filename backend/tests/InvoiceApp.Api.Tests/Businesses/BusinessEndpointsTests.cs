using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Identity;
using InvoiceApp.Domain.Businesses;

namespace InvoiceApp.Api.Tests.Businesses;

/// <summary>
/// Verifies IG-53's own AC at the real HTTP pipeline level: the account's one Business profile
/// (created at registration) is readable and its supported identity/contact/tax/default fields can
/// be updated, with account ownership enforced.
/// </summary>
public class BusinessEndpointsTests
{
    private const string BusinessEndpoint = "/api/v1/business";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static BusinessProfileRequest ValidRequest() => new(
        BusinessName: "Acme Pty Ltd",
        LegalName: "Acme Proprietary Limited",
        Email: "billing@acme.example",
        Phone: "+61 2 5550 1234",
        Website: "https://acme.example",
        AddressLine1: "1 Example St",
        AddressLine2: "Suite 4",
        City: "Sydney",
        State: "NSW",
        PostalCode: "2000",
        Country: "AU",
        RegistrationNumber: "ABN 12 345 678 901",
        TaxNumber: "GST-12345",
        DefaultCurrency: "AUD",
        DefaultTaxRate: 10,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        DefaultPaymentTerms: PaymentTermsOption.Net30,
        DefaultPaymentTermsDays: null,
        DefaultInvoiceNotes: "Thanks for your business",
        DefaultTermsAndConditions: "Payment due within terms",
        DefaultTemplateId: null);

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    [Fact]
    public async Task Missing_session_cannot_view_the_business_profile()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(BusinessEndpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Registration_created_default_profile_is_immediately_readable()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "profile-default@example.com");

        var response = await client.GetAsync(BusinessEndpoint);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.NotNull(profile);
        Assert.Equal("AU", profile!.Country);
        Assert.Equal("AUD", profile.DefaultCurrency);
    }

    [Fact]
    public async Task Updates_the_supported_identity_contact_tax_and_default_fields()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "profile-update@example.com");

        var response = await client.PutAsJsonAsync(BusinessEndpoint, ValidRequest());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal("Acme Pty Ltd", updated!.BusinessName);
        Assert.Equal("Acme Proprietary Limited", updated.LegalName);
        Assert.Equal("billing@acme.example", updated.Email);
        Assert.Equal("Sydney", updated.City);
        Assert.Equal(10, updated.DefaultTaxRate);
        Assert.Equal(TaxCalculationMethod.Exclusive, updated.TaxCalculationMethod);
        Assert.Equal(PaymentTermsOption.Net30, updated.DefaultPaymentTerms);
        Assert.Equal("Thanks for your business", updated.DefaultInvoiceNotes);

        var getResponse = await client.GetAsync(BusinessEndpoint);
        var refetched = await getResponse.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.Equal(updated.BusinessName, refetched!.BusinessName);
    }

    [Fact]
    public async Task Clears_custom_payment_terms_days_when_switching_away_from_custom()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "profile-terms@example.com");
        await client.PutAsJsonAsync(BusinessEndpoint, ValidRequest() with { DefaultPaymentTerms = PaymentTermsOption.Custom, DefaultPaymentTermsDays = 45 });

        var response = await client.PutAsJsonAsync(BusinessEndpoint, ValidRequest() with { DefaultPaymentTerms = PaymentTermsOption.Net30, DefaultPaymentTermsDays = 45 });

        var updated = await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.Equal(PaymentTermsOption.Net30, updated!.DefaultPaymentTerms);
        Assert.Null(updated.DefaultPaymentTermsDays);
    }

    [Fact]
    public async Task Rejects_custom_payment_terms_with_no_day_count()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "profile-terms-invalid@example.com");

        var response = await client.PutAsJsonAsync(BusinessEndpoint, ValidRequest() with { DefaultPaymentTerms = PaymentTermsOption.Custom, DefaultPaymentTermsDays = null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Rejects_a_missing_business_name()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "profile-invalid-name@example.com");

        var response = await client.PutAsJsonAsync(BusinessEndpoint, ValidRequest() with { BusinessName = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Rejects_an_invalid_email()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "profile-invalid-email@example.com");

        var response = await client.PutAsJsonAsync(BusinessEndpoint, ValidRequest() with { Email = "not-an-email" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Rejects_a_country_code_that_is_not_two_letters()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "profile-invalid-country@example.com");

        var response = await client.PutAsJsonAsync(BusinessEndpoint, ValidRequest() with { Country = "AUS" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Each_account_has_its_own_independent_profile()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var firstClient = await RegisteredClientAsync(factory, "profile-first@example.com");
        using var secondClient = await RegisteredClientAsync(factory, "profile-second@example.com");

        await firstClient.PutAsJsonAsync(BusinessEndpoint, ValidRequest() with { BusinessName = "First Business" });

        var secondResponse = await secondClient.GetAsync(BusinessEndpoint);
        var secondProfile = await secondResponse.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);

        Assert.NotEqual("First Business", secondProfile!.BusinessName);
    }
}
