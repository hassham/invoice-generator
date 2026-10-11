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
/// IG-295: an account can hold several businesses, each with its own profile and numbering. These
/// exercise the /api/v1/businesses routes at the HTTP pipeline level, including the account
/// isolation rule that another account's business id is reported as not found.
/// </summary>
public class BusinessCollectionEndpointsTests
{
    private const string BusinessesEndpoint = "/api/v1/businesses";
    private const string LegacyBusinessEndpoint = "/api/v1/business";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<BusinessProfileDto> CreateBusinessAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync(BusinessesEndpoint, new CreateBusinessRequest(name, "AU", "AUD"));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions))!;
    }

    private static async Task<BusinessProfileDto> DefaultBusinessAsync(HttpClient client)
    {
        var response = await client.GetAsync(LegacyBusinessEndpoint);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions))!;
    }

    private static BusinessProfileRequest ProfileRequest(string businessName) => new(
        BusinessName: businessName,
        LegalName: null,
        Email: null,
        Phone: null,
        Website: null,
        AddressLine1: null,
        AddressLine2: null,
        City: null,
        State: null,
        PostalCode: null,
        Country: "AU",
        RegistrationNumber: null,
        TaxNumber: null,
        DefaultCurrency: "AUD",
        DefaultTaxRate: 10,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        DefaultPaymentTerms: PaymentTermsOption.Net30,
        DefaultPaymentTermsDays: null,
        DefaultInvoiceNotes: null,
        DefaultTermsAndConditions: null,
        DefaultTemplateId: null,
        InvoicePrefix: "INV-",
        NextInvoiceNumber: 1,
        InvoiceNumberPadding: 4);

    [Fact]
    public async Task Missing_session_cannot_list_businesses()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(BusinessesEndpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Listing_shows_the_default_business_before_any_are_created()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "collection-default@example.com");
        var defaultBusiness = await DefaultBusinessAsync(client);

        var response = await client.GetAsync(BusinessesEndpoint);

        response.EnsureSuccessStatusCode();
        var businesses = await response.Content.ReadFromJsonAsync<List<BusinessProfileDto>>(JsonOptions);
        Assert.Single(businesses!);
        Assert.Equal(defaultBusiness.Id, businesses![0].Id);
    }

    [Fact]
    public async Task Creating_a_business_returns_it_with_fresh_numbering_and_lists_it_alongside_the_default()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "collection-create@example.com");
        var defaultBusiness = await DefaultBusinessAsync(client);

        var response = await client.PostAsJsonAsync(BusinessesEndpoint, new CreateBusinessRequest("Side Project", "NZ", "NZD", InvoicePrefix: "SP-", InvoiceNumberPadding: 3));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.NotEqual(defaultBusiness.Id, created!.Id);
        Assert.Equal("Side Project", created.BusinessName);
        Assert.Equal("NZ", created.Country);
        Assert.Equal("NZD", created.DefaultCurrency);
        Assert.Equal("SP-", created.InvoicePrefix);
        Assert.Equal(1, created.NextInvoiceNumber);

        var listResponse = await client.GetAsync(BusinessesEndpoint);
        var businesses = await listResponse.Content.ReadFromJsonAsync<List<BusinessProfileDto>>(JsonOptions);
        Assert.Equal(2, businesses!.Count);
        Assert.Contains(businesses, b => b.Id == created.Id);
        Assert.Contains(businesses, b => b.Id == defaultBusiness.Id);
    }

    [Fact]
    public async Task The_default_business_is_unchanged_by_creating_another()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "collection-unchanged@example.com");
        var before = await DefaultBusinessAsync(client);

        await CreateBusinessAsync(client, "Second Business");

        var after = await DefaultBusinessAsync(client);
        Assert.Equal(before.Id, after.Id);
        Assert.Equal(before.BusinessName, after.BusinessName);
    }

    [Fact]
    public async Task Bank_details_are_saved_per_business_and_do_not_leak_to_the_default_business()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "collection-bank@example.com");
        var defaultBusiness = await DefaultBusinessAsync(client);
        var created = await CreateBusinessAsync(client, "Bank Co");

        var request = ProfileRequest("Bank Co") with
        {
            BankName = "Example Bank",
            BankAccountName = "Bank Co Pty Ltd",
            BankAccountNumber = "12345678",
            BankRoutingCode = "062-000",
        };
        var response = await client.PutAsJsonAsync($"{BusinessesEndpoint}/{created.Id}", request);

        response.EnsureSuccessStatusCode();
        var saved = await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.Equal("Example Bank", saved!.BankName);
        Assert.Equal("12345678", saved.BankAccountNumber);
        Assert.Equal("062-000", saved.BankRoutingCode);

        var untouched = await DefaultBusinessAsync(client);
        Assert.Equal(defaultBusiness.Id, untouched.Id);
        Assert.Null(untouched.BankName);
    }

    [Fact]
    public async Task A_bank_account_number_longer_than_the_column_is_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "collection-bank-long@example.com");
        var created = await CreateBusinessAsync(client, "Bank Long");

        var response = await client.PutAsJsonAsync(
            $"{BusinessesEndpoint}/{created.Id}",
            ProfileRequest("Bank Long") with { BankAccountNumber = new string('1', 51) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Getting_a_business_by_id_returns_that_business()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "collection-get@example.com");
        var created = await CreateBusinessAsync(client, "Get Me");

        var response = await client.GetAsync($"{BusinessesEndpoint}/{created.Id}");

        response.EnsureSuccessStatusCode();
        var fetched = await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.Equal(created.Id, fetched!.Id);
        Assert.Equal("Get Me", fetched.BusinessName);
    }

    [Fact]
    public async Task Updating_by_id_changes_only_that_business()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "collection-update@example.com");
        var defaultBusiness = await DefaultBusinessAsync(client);
        var created = await CreateBusinessAsync(client, "Before Rename");

        var response = await client.PutAsJsonAsync($"{BusinessesEndpoint}/{created.Id}", ProfileRequest("After Rename"));

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.Equal("After Rename", updated!.BusinessName);

        var untouched = await DefaultBusinessAsync(client);
        Assert.Equal(defaultBusiness.BusinessName, untouched.BusinessName);
    }

    [Fact]
    public async Task An_unknown_business_id_is_not_found()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "collection-unknown@example.com");

        var getResponse = await client.GetAsync($"{BusinessesEndpoint}/{Guid.NewGuid()}");
        var putResponse = await client.PutAsJsonAsync($"{BusinessesEndpoint}/{Guid.NewGuid()}", ProfileRequest("Nope"));

        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, putResponse.StatusCode);
    }

    [Fact]
    public async Task Another_accounts_business_is_not_visible_by_id_or_in_the_list()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "collection-owner@example.com");
        using var intruder = await RegisteredClientAsync(factory, "collection-intruder@example.com");
        var ownersBusiness = await CreateBusinessAsync(owner, "Owner Only");

        var getResponse = await intruder.GetAsync($"{BusinessesEndpoint}/{ownersBusiness.Id}");
        var listResponse = await intruder.GetAsync(BusinessesEndpoint);

        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        var intruderBusinesses = await listResponse.Content.ReadFromJsonAsync<List<BusinessProfileDto>>(JsonOptions);
        Assert.DoesNotContain(intruderBusinesses!, b => b.Id == ownersBusiness.Id);
    }

    [Fact]
    public async Task Another_accounts_business_cannot_be_updated_by_id()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "collection-owner-update@example.com");
        using var intruder = await RegisteredClientAsync(factory, "collection-intruder-update@example.com");
        var ownersBusiness = await CreateBusinessAsync(owner, "Owner Name");

        var response = await intruder.PutAsJsonAsync($"{BusinessesEndpoint}/{ownersBusiness.Id}", ProfileRequest("Hijacked"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var stillOwned = await owner.GetAsync($"{BusinessesEndpoint}/{ownersBusiness.Id}");
        var profile = await stillOwned.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.Equal("Owner Name", profile!.BusinessName);
    }

    [Fact]
    public async Task Creating_a_business_with_a_blank_name_is_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "collection-blank@example.com");

        var response = await client.PostAsJsonAsync(BusinessesEndpoint, new CreateBusinessRequest("   ", "AU", "AUD"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Creating_a_business_with_an_invalid_country_or_currency_is_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "collection-invalid@example.com");

        var badCountry = await client.PostAsJsonAsync(BusinessesEndpoint, new CreateBusinessRequest("Acme", "Australia", "AUD"));
        var badCurrency = await client.PostAsJsonAsync(BusinessesEndpoint, new CreateBusinessRequest("Acme", "AU", "AU"));

        Assert.Equal(HttpStatusCode.BadRequest, badCountry.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, badCurrency.StatusCode);
    }

    [Fact]
    public async Task Creating_a_business_with_out_of_range_estimate_padding_is_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "collection-estimate-padding@example.com");

        var response = await client.PostAsJsonAsync(BusinessesEndpoint, new CreateBusinessRequest("Acme", "AU", "AUD", EstimateNumberPadding: 0));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Creating_a_business_without_a_session_is_unauthorized()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(BusinessesEndpoint, new CreateBusinessRequest("Acme", "AU", "AUD"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
