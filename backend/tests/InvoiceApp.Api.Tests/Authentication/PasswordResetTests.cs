using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InvoiceApp.Application.Identity;

namespace InvoiceApp.Api.Tests.Authentication;

/// <summary>
/// Verifies IG-97/IG-98's completion criteria at the real HTTP pipeline level: a reset request
/// never reveals whether the email exists, a valid single-use token lets the account holder pick
/// a new password and log in with it, and unknown/reused/expired/invalid tokens are all rejected
/// the same generic way.
/// </summary>
public class PasswordResetTests
{
    private const string RegisterEndpoint = "/api/v1/auth/register";
    private const string LoginEndpoint = "/api/v1/auth/login";
    private const string ForgotPasswordEndpoint = "/api/v1/auth/forgot-password";
    private const string ResetPasswordEndpoint = "/api/v1/auth/reset-password";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task Forgot_password_returns_200_for_a_known_email_and_sends_a_token()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "known.forgot@example.com");

        var response = await client.PostAsJsonAsync(ForgotPasswordEndpoint, new ForgotPasswordRequest("known.forgot@example.com"), JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var message = Assert.Single(factory.EmailSender.SentMessages);
        Assert.Equal("known.forgot@example.com", message.Email);
    }

    [Fact]
    public async Task Forgot_password_returns_the_same_200_for_an_unknown_email_and_sends_nothing()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(ForgotPasswordEndpoint, new ForgotPasswordRequest("unknown.forgot@example.com"), JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(factory.EmailSender.SentMessages);
    }

    [Fact]
    public async Task A_valid_reset_token_lets_the_account_holder_log_in_with_the_new_password()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "reset.flow@example.com");

        await client.PostAsJsonAsync(ForgotPasswordEndpoint, new ForgotPasswordRequest("reset.flow@example.com"), JsonOptions);
        var token = factory.EmailSender.SentMessages[0].Token;

        var resetResponse = await client.PostAsJsonAsync(
            ResetPasswordEndpoint,
            new ResetPasswordRequest("reset.flow@example.com", token, "NewPassword1", "NewPassword1"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

        var newLoginResponse = await client.PostAsJsonAsync(
            LoginEndpoint, new LoginRequest("reset.flow@example.com", "NewPassword1", RememberMe: false), JsonOptions);
        Assert.Equal(HttpStatusCode.OK, newLoginResponse.StatusCode);

        var oldLoginResponse = await client.PostAsJsonAsync(
            LoginEndpoint, new LoginRequest("reset.flow@example.com", "Password1", RememberMe: false), JsonOptions);
        Assert.Equal(HttpStatusCode.Unauthorized, oldLoginResponse.StatusCode);
    }

    [Fact]
    public async Task A_reused_reset_token_is_rejected_on_the_second_attempt()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "reused.http@example.com");

        await client.PostAsJsonAsync(ForgotPasswordEndpoint, new ForgotPasswordRequest("reused.http@example.com"), JsonOptions);
        var token = factory.EmailSender.SentMessages[0].Token;

        var first = await client.PostAsJsonAsync(
            ResetPasswordEndpoint,
            new ResetPasswordRequest("reused.http@example.com", token, "NewPassword1", "NewPassword1"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await client.PostAsJsonAsync(
            ResetPasswordEndpoint,
            new ResetPasswordRequest("reused.http@example.com", token, "AnotherPassword1", "AnotherPassword1"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
    }

    [Fact]
    public async Task An_invalid_reset_token_is_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();
        await RegisterAsync(client, "invalid.http@example.com");

        var response = await client.PostAsJsonAsync(
            ResetPasswordEndpoint,
            new ResetPasswordRequest("invalid.http@example.com", "not-a-real-token", "NewPassword1", "NewPassword1"),
            JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task An_expired_reset_token_is_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory(passwordResetTokenLifespanOverride: TimeSpan.FromMilliseconds(50));
        using var client = factory.CreateClient();
        await RegisterAsync(client, "expired.http@example.com");

        await client.PostAsJsonAsync(ForgotPasswordEndpoint, new ForgotPasswordRequest("expired.http@example.com"), JsonOptions);
        var token = factory.EmailSender.SentMessages[0].Token;

        await Task.Delay(TimeSpan.FromMilliseconds(300));

        var response = await client.PostAsJsonAsync(
            ResetPasswordEndpoint,
            new ResetPasswordRequest("expired.http@example.com", token, "NewPassword1", "NewPassword1"),
            JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Requesting_a_reset_repeatedly_beyond_the_rate_limit_returns_429()
    {
        using var factory = new AuthenticatedRouteTestFactory(rateLimitPermitLimitOverride: 2);
        using var client = factory.CreateClient();

        for (var i = 0; i < 2; i++)
        {
            var response = await client.PostAsJsonAsync(ForgotPasswordEndpoint, new ForgotPasswordRequest("rate.limited@example.com"), JsonOptions);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        var throttledResponse = await client.PostAsJsonAsync(ForgotPasswordEndpoint, new ForgotPasswordRequest("rate.limited@example.com"), JsonOptions);
        Assert.Equal(HttpStatusCode.TooManyRequests, throttledResponse.StatusCode);
    }

    private static async Task RegisterAsync(HttpClient client, string email)
    {
        var request = new RegisterAccountRequest(email, "Password1", "Password1", null);
        var response = await client.PostAsJsonAsync(RegisterEndpoint, request, JsonOptions);
        response.EnsureSuccessStatusCode();
    }
}
