using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Customers;
using InvoiceApp.Application.Identity;

namespace InvoiceApp.Api.Tests.Customers;

/// <summary>
/// Verifies IG-55's own AC at the real HTTP pipeline level: authorized users can create/view/update
/// customers, account ownership is enforced (a second account's customers are invisible, not just
/// inaccessible), and archiving hides a customer from the default list without deleting it (FSD
/// section 58).
/// </summary>
public class CustomerEndpointsTests
{
    private static string CustomersEndpoint(Guid businessId) => $"/api/v1/businesses/{businessId}/customers";

    [Fact]
    public async Task Missing_session_cannot_list_customers()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(CustomersEndpoint(Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Creates_a_customer_and_returns_its_location()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        var businessId = await RegisterAsync(client, "creator@example.com");

        var response = await client.PostAsJsonAsync(CustomersEndpoint(businessId), ValidRequest());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CustomerDto>();
        Assert.NotNull(created);
        Assert.Equal("Acme Pty Ltd", created!.BusinessName);
        Assert.False(created.IsArchived);
        Assert.Equal($"{CustomersEndpoint(businessId)}/{created.Id}", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task Rejects_a_customer_with_no_identifying_name()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        var businessId = await RegisterAsync(client, "invalid.customer@example.com");

        var response = await client.PostAsJsonAsync(CustomersEndpoint(businessId), ValidRequest() with { BusinessName = null, ContactName = null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Another_accounts_customers_are_not_listed_under_my_business()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var ownerClient = factory.CreateClient();
        var businessId = await RegisterAsync(ownerClient, "owner@example.com");
        await ownerClient.PostAsJsonAsync(CustomersEndpoint(businessId), ValidRequest());

        using var otherClient = factory.CreateClient();
        await RegisterAsync(otherClient, "other@example.com");

        var response = await otherClient.GetAsync(CustomersEndpoint(businessId));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Cannot_view_another_accounts_customer()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var ownerClient = factory.CreateClient();
        var businessId = await RegisterAsync(ownerClient, "owner2@example.com");
        var createResponse = await ownerClient.PostAsJsonAsync(CustomersEndpoint(businessId), ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<CustomerDto>();

        using var otherClient = factory.CreateClient();
        await RegisterAsync(otherClient, "other2@example.com");

        var response = await otherClient.GetAsync($"{CustomersEndpoint(businessId)}/{created!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Updates_a_customers_supported_fields()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        var businessId = await RegisterAsync(client, "updater@example.com");
        var createResponse = await client.PostAsJsonAsync(CustomersEndpoint(businessId), ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<CustomerDto>();

        var response = await client.PutAsJsonAsync($"{CustomersEndpoint(businessId)}/{created!.Id}", ValidRequest() with { ContactName = "Updated Contact" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<CustomerDto>();
        Assert.Equal("Updated Contact", updated!.ContactName);
    }

    [Fact]
    public async Task Archiving_hides_a_customer_from_the_default_list_but_not_the_full_list()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        var businessId = await RegisterAsync(client, "archiver@example.com");
        var createResponse = await client.PostAsJsonAsync(CustomersEndpoint(businessId), ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<CustomerDto>();

        var archiveResponse = await client.DeleteAsync($"{CustomersEndpoint(businessId)}/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, archiveResponse.StatusCode);

        var defaultList = await (await client.GetAsync(CustomersEndpoint(businessId))).Content.ReadFromJsonAsync<List<CustomerDto>>();
        Assert.Empty(defaultList!);

        var fullList = await (await client.GetAsync($"{CustomersEndpoint(businessId)}?includeArchived=true")).Content.ReadFromJsonAsync<List<CustomerDto>>();
        Assert.Single(fullList!);
        Assert.True(fullList![0].IsArchived);
    }

    private static CustomerRequest ValidRequest() => new(
        "Acme Pty Ltd",
        "Jamie Lee",
        "billing@acme.example",
        "0400000000",
        "1 Main St",
        null,
        "Sydney",
        "NSW",
        "2000",
        "AU",
        "12345",
        "Preferred customer");

    private static async Task<Guid> RegisterAsync(HttpClient client, string email)
    {
        var request = new RegisterAccountRequest(email, "Password1", "Password1", null);
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", request);
        response.EnsureSuccessStatusCode();

        using var business = await JsonDocument.ParseAsync(await client.GetStreamAsync("/api/v1/business"));
        return business.RootElement.GetProperty("id").GetGuid();
    }
}
