using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace InvoiceApp.Api.Tests.Authentication;

/// <summary>
/// Covers what's mechanically testable about IG-93/IG-94 without a live Google account or
/// browser: the challenge redirect's shape, and the callback endpoint's handling of the
/// cancellation/failure and missing-external-session cases. The account find-or-create/link/
/// reject logic itself is covered directly in ExternalLoginServiceTests, bypassing the OAuth
/// handshake entirely; a real end-to-end "sign in with Google" pass needs a manual browser check
/// (see the IG-93 claim comment).
/// </summary>
public class GoogleAuthenticationTests
{
    private const string GoogleLoginEndpoint = "/api/v1/auth/google/login";
    private const string GoogleCallbackEndpoint = "/api/v1/auth/google/callback";

    [Fact]
    public async Task Login_challenges_by_redirecting_to_Google()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var response = await client.GetAsync(GoogleLoginEndpoint);

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        var location = response.Headers.Location?.ToString() ?? string.Empty;
        Assert.Contains("accounts.google.com", location, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("client_id=test-client-id", location, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Callback_with_an_error_query_parameter_is_rejected_without_leaking_the_raw_reason()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"{GoogleCallbackEndpoint}?error=access_denied");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Google sign-in was cancelled or failed. Please try again.", body);
        Assert.DoesNotContain("access_denied", body);
    }

    [Fact]
    public async Task Callback_without_a_pending_external_login_is_rejected()
    {
        // Hitting the callback URL directly, with no prior /google/login challenge ever having
        // populated the short-lived external-scheme cookie - simulates an expired or replayed
        // callback link.
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(GoogleCallbackEndpoint);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Google sign-in session expired. Please try again.", body);
    }
}
