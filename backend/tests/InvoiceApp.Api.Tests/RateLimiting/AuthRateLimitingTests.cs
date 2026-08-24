using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Identity;

namespace InvoiceApp.Api.Tests.RateLimiting;

/// <summary>
/// Verifies IG-100's rate-limiting completion criterion (docs/SAD.md section 112) at the real
/// HTTP pipeline level: the "auth" policy applied to register/login actually rejects requests
/// once the configured limit is exceeded. Overrides the real default down to a small,
/// deterministic threshold so the test doesn't need to fire dozens of requests to trip it.
/// </summary>
public class AuthRateLimitingTests
{
    private const string RegisterEndpoint = "/api/v1/auth/register";
    private const int PermitLimit = 3;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task Requests_within_the_configured_limit_all_succeed()
    {
        using var factory = new AuthenticatedRouteTestFactory(rateLimitPermitLimitOverride: PermitLimit);
        using var client = factory.CreateClient();

        for (var i = 0; i < PermitLimit; i++)
        {
            var response = await RegisterAsync(client);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    [Fact]
    public async Task Requests_beyond_the_configured_limit_are_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory(rateLimitPermitLimitOverride: PermitLimit);
        using var client = factory.CreateClient();

        for (var i = 0; i < PermitLimit; i++)
        {
            (await RegisterAsync(client)).EnsureSuccessStatusCode();
        }

        var rejected = await RegisterAsync(client);

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
    }

    private static Task<HttpResponseMessage> RegisterAsync(HttpClient client)
    {
        var request = new RegisterAccountRequest($"rate-limit-{Guid.NewGuid():N}@example.com", "Password1", "Password1", null);
        return client.PostAsJsonAsync(RegisterEndpoint, request, JsonOptions);
    }
}
