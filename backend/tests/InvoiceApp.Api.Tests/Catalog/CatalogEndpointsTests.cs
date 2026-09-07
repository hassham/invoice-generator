using System.Net;
using System.Net.Http.Json;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Catalog;
using InvoiceApp.Application.Identity;

namespace InvoiceApp.Api.Tests.Catalog;

/// <summary>
/// Verifies IG-57's own AC at the real HTTP pipeline level: authorized users can create/view/update
/// catalogue items, account ownership is enforced (a second account's items are invisible, not just
/// inaccessible), archiving hides an item from the default list without deleting it (FSD section
/// 61), and Duplicate (FSD section 59) creates an independent copy.
/// </summary>
public class CatalogEndpointsTests
{
    private const string ItemsEndpoint = "/api/v1/items";

    [Fact]
    public async Task Missing_session_cannot_list_items()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(ItemsEndpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Creates_an_item_and_returns_its_location()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "creator@example.com");

        var response = await client.PostAsJsonAsync(ItemsEndpoint, ValidRequest());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CatalogItemDto>();
        Assert.NotNull(created);
        Assert.Equal("Consulting Hour", created!.Name);
        Assert.False(created.IsArchived);
        Assert.Equal($"{ItemsEndpoint}/{created.Id}", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task Rejects_an_item_with_no_name()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "invalid.item@example.com");

        var response = await client.PostAsJsonAsync(ItemsEndpoint, ValidRequest() with { Name = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Rejects_a_negative_unit_price()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "invalid.price@example.com");

        var response = await client.PostAsJsonAsync(ItemsEndpoint, ValidRequest() with { UnitPrice = -1 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Lists_only_the_signed_in_accounts_items()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var ownerClient = factory.CreateClient();
        await RegisterAsync(ownerClient, "owner@example.com");
        await ownerClient.PostAsJsonAsync(ItemsEndpoint, ValidRequest());

        using var otherClient = factory.CreateClient();
        await RegisterAsync(otherClient, "other@example.com");

        var response = await otherClient.GetAsync(ItemsEndpoint);

        var items = await response.Content.ReadFromJsonAsync<List<CatalogItemDto>>();
        Assert.Empty(items!);
    }

    [Fact]
    public async Task Cannot_view_another_accounts_item()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var ownerClient = factory.CreateClient();
        await RegisterAsync(ownerClient, "owner2@example.com");
        var createResponse = await ownerClient.PostAsJsonAsync(ItemsEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<CatalogItemDto>();

        using var otherClient = factory.CreateClient();
        await RegisterAsync(otherClient, "other2@example.com");

        var response = await otherClient.GetAsync($"{ItemsEndpoint}/{created!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Updates_an_items_supported_fields()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "updater@example.com");
        var createResponse = await client.PostAsJsonAsync(ItemsEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<CatalogItemDto>();

        var response = await client.PutAsJsonAsync($"{ItemsEndpoint}/{created!.Id}", ValidRequest() with { UnitPrice = 200m });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<CatalogItemDto>();
        Assert.Equal(200m, updated!.UnitPrice);
    }

    [Fact]
    public async Task Archiving_hides_an_item_from_the_default_list_but_not_the_full_list()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "archiver@example.com");
        var createResponse = await client.PostAsJsonAsync(ItemsEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<CatalogItemDto>();

        var archiveResponse = await client.DeleteAsync($"{ItemsEndpoint}/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, archiveResponse.StatusCode);

        var defaultList = await (await client.GetAsync(ItemsEndpoint)).Content.ReadFromJsonAsync<List<CatalogItemDto>>();
        Assert.Empty(defaultList!);

        var fullList = await (await client.GetAsync($"{ItemsEndpoint}?includeArchived=true")).Content.ReadFromJsonAsync<List<CatalogItemDto>>();
        Assert.Single(fullList!);
        Assert.True(fullList![0].IsArchived);
    }

    [Fact]
    public async Task Duplicating_an_item_creates_an_independent_copy()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "duplicator@example.com");
        var createResponse = await client.PostAsJsonAsync(ItemsEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<CatalogItemDto>();

        var duplicateResponse = await client.PostAsync($"{ItemsEndpoint}/{created!.Id}/duplicate", null);

        Assert.Equal(HttpStatusCode.Created, duplicateResponse.StatusCode);
        var duplicate = await duplicateResponse.Content.ReadFromJsonAsync<CatalogItemDto>();
        Assert.NotEqual(created.Id, duplicate!.Id);
        Assert.Equal("Consulting Hour (Copy)", duplicate.Name);
        Assert.Equal(created.UnitPrice, duplicate.UnitPrice);
        Assert.False(duplicate.IsArchived);

        // Editing the duplicate must not affect the original - proves it's a real independent
        // copy, not a shared reference.
        await client.PutAsJsonAsync($"{ItemsEndpoint}/{duplicate.Id}", ValidRequest() with { UnitPrice = 999m });
        var originalAfter = await (await client.GetAsync($"{ItemsEndpoint}/{created.Id}")).Content.ReadFromJsonAsync<CatalogItemDto>();
        Assert.Equal(created.UnitPrice, originalAfter!.UnitPrice);
    }

    [Fact]
    public async Task Cannot_duplicate_another_accounts_item()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        using var ownerClient = factory.CreateClient();
        await RegisterAsync(ownerClient, "owner3@example.com");
        var createResponse = await ownerClient.PostAsJsonAsync(ItemsEndpoint, ValidRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<CatalogItemDto>();

        using var otherClient = factory.CreateClient();
        await RegisterAsync(otherClient, "other3@example.com");

        var response = await otherClient.PostAsync($"{ItemsEndpoint}/{created!.Id}/duplicate", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static CatalogItemRequest ValidRequest() => new(
        "Consulting Hour",
        "One hour of consulting",
        "SKU-1",
        "hour",
        150m,
        10m);

    private static async Task RegisterAsync(HttpClient client, string email)
    {
        var request = new RegisterAccountRequest(email, "Password1", "Password1", null);
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", request);
        response.EnsureSuccessStatusCode();
    }
}
