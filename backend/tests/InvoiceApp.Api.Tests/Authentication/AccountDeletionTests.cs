using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InvoiceApp.Application.Identity;
using Microsoft.AspNetCore.Mvc.Testing;

namespace InvoiceApp.Api.Tests.Authentication;

/// <summary>
/// Verifies IG-101/IG-102's completion criteria at the real HTTP pipeline level: only the
/// authenticated owner can confirm deletion with their current password, the deleting session is
/// invalidated, the deleted account is rejected everywhere afterward - including a still-valid
/// cookie from another session that was never itself signed out - and the account cannot log back
/// in.
/// </summary>
public class AccountDeletionTests
{
    private const string RegisterEndpoint = "/api/v1/auth/register";
    private const string LoginEndpoint = "/api/v1/auth/login";
    private const string MeEndpoint = "/api/v1/auth/me";
    private const string DeleteAccountEndpoint = "/api/v1/auth/account";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task Missing_session_cannot_delete_the_account()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await DeleteAccountAsync(client, "Password1");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Wrong_password_confirmation_is_rejected_and_the_account_still_works()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "wrong.confirm@example.com");

        var deleteResponse = await DeleteAccountAsync(client, "WrongPassword1");
        Assert.Equal(HttpStatusCode.Unauthorized, deleteResponse.StatusCode);

        var meResponse = await client.GetAsync(MeEndpoint);
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);
    }

    [Fact]
    public async Task Correct_confirmation_deletes_the_account_and_invalidates_the_deleting_session()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "delete.me@example.com");

        var deleteResponse = await DeleteAccountAsync(client, "Password1");
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        var meResponse = await client.GetAsync(MeEndpoint);
        Assert.Equal(HttpStatusCode.Unauthorized, meResponse.StatusCode);
    }

    [Fact]
    public async Task Deleted_account_cannot_log_in_again()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "no.relogin@example.com");
        await DeleteAccountAsync(client, "Password1");

        var loginRequest = new LoginRequest("no.relogin@example.com", "Password1", RememberMe: false);
        var response = await client.PostAsJsonAsync(LoginEndpoint, loginRequest, JsonOptions);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Missing_password_confirmation_is_rejected_as_a_validation_error()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "missing.confirm@example.com");

        var response = await DeleteAccountAsync(client, currentPassword: "");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task A_still_valid_cookie_that_was_never_itself_signed_out_is_rejected_after_deletion()
    {
        // Cookie handling disabled so the exact raw cookie value can be captured once and
        // replayed by hand on every request, deliberately ignoring the expired Set-Cookie the
        // delete response itself carries - simulating a second browser tab that never received
        // that response. Proves deletion invalidates access beyond just the request that
        // performed it (IG-102's "the session is invalidated" read broadly, not narrowly).
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

        var registerResponse = await RegisterAsync(client, "other.session@example.com");
        var (cookieName, cookieValue) = ParseSetCookie(registerResponse.Headers.GetValues("Set-Cookie").Single());

        using var meBeforeRequest = new HttpRequestMessage(HttpMethod.Get, MeEndpoint);
        meBeforeRequest.Headers.Add("Cookie", $"{cookieName}={cookieValue}");
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(meBeforeRequest)).StatusCode);

        using var deleteRequest = new HttpRequestMessage(HttpMethod.Delete, DeleteAccountEndpoint)
        {
            Content = JsonContent.Create(new DeleteAccountRequest("Password1"), options: JsonOptions),
        };
        deleteRequest.Headers.Add("Cookie", $"{cookieName}={cookieValue}");
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(deleteRequest)).StatusCode);

        using var meAfterRequest = new HttpRequestMessage(HttpMethod.Get, MeEndpoint);
        meAfterRequest.Headers.Add("Cookie", $"{cookieName}={cookieValue}");
        var meAfterResponse = await client.SendAsync(meAfterRequest);

        Assert.Equal(HttpStatusCode.Unauthorized, meAfterResponse.StatusCode);
    }

    private static async Task<HttpResponseMessage> RegisterAsync(HttpClient client, string email)
    {
        var request = new RegisterAccountRequest(email, "Password1", "Password1", null);
        var response = await client.PostAsJsonAsync(RegisterEndpoint, request, JsonOptions);
        response.EnsureSuccessStatusCode();
        return response;
    }

    private static async Task<HttpResponseMessage> DeleteAccountAsync(HttpClient client, string currentPassword)
    {
        using var request = new HttpRequestMessage(HttpMethod.Delete, DeleteAccountEndpoint)
        {
            Content = JsonContent.Create(new DeleteAccountRequest(currentPassword), options: JsonOptions),
        };
        return await client.SendAsync(request);
    }

    private static (string Name, string Value) ParseSetCookie(string setCookieHeader)
    {
        var nameValue = setCookieHeader.Split(';')[0];
        var separatorIndex = nameValue.IndexOf('=');
        return (nameValue[..separatorIndex], nameValue[(separatorIndex + 1)..]);
    }
}
