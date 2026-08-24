using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InvoiceApp.Application.Identity;
using Microsoft.AspNetCore.Mvc.Testing;

namespace InvoiceApp.Api.Tests.Authentication;

/// <summary>
/// Verifies IG-99's completion criterion at the actual HTTP/middleware level - not just that
/// the underlying services behave correctly (AuthSessionServiceTests already covers that), but
/// that the real Api pipeline's [RequireAuthorization()] endpoints genuinely reject requests
/// carrying no session, a tampered session, or an expired session.
/// </summary>
public class ProtectedRouteAuthorizationTests
{
    private const string RegisterEndpoint = "/api/v1/auth/register";
    private const string MeEndpoint = "/api/v1/auth/me";
    private const string LogoutEndpoint = "/api/v1/auth/logout";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task Missing_session_cannot_access_me()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(MeEndpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Missing_session_cannot_access_logout()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsync(LogoutEndpoint, content: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Valid_session_can_access_me()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "valid.session@example.com");

        var response = await client.GetAsync(MeEndpoint);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Invalid_session_cookie_cannot_access_me()
    {
        using var factory = new AuthenticatedRouteTestFactory();

        // Cookie handling disabled so the real Set-Cookie header can be captured, corrupted and
        // replayed by hand - this proves the data-protected ticket itself is validated, not just
        // whether a cookie header happens to be present.
        using var registrationClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var registerResponse = await RegisterAsync(registrationClient, "invalid.cookie@example.com");
        var (cookieName, cookieValue) = ParseSetCookie(registerResponse.Headers.GetValues("Set-Cookie").Single());

        using var attackClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        using var request = new HttpRequestMessage(HttpMethod.Get, MeEndpoint);
        request.Headers.Add("Cookie", $"{cookieName}={cookieValue}TAMPERED");

        var response = await attackClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Expired_session_cannot_access_me()
    {
        using var factory = new AuthenticatedRouteTestFactory(cookieExpireOverride: TimeSpan.FromMilliseconds(200));
        using var client = factory.CreateClient();
        await RegisterAsync(client, "expired.session@example.com");

        await Task.Delay(TimeSpan.FromSeconds(1));
        var response = await client.GetAsync(MeEndpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static async Task<HttpResponseMessage> RegisterAsync(HttpClient client, string email)
    {
        var request = new RegisterAccountRequest(email, "Password1", "Password1", null);
        var response = await client.PostAsJsonAsync(RegisterEndpoint, request, JsonOptions);
        response.EnsureSuccessStatusCode();
        return response;
    }

    private static (string Name, string Value) ParseSetCookie(string setCookieHeader)
    {
        var nameValue = setCookieHeader.Split(';')[0];
        var separatorIndex = nameValue.IndexOf('=');
        return (nameValue[..separatorIndex], nameValue[(separatorIndex + 1)..]);
    }
}
