using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using Microsoft.AspNetCore.Http;

namespace InvoiceApp.Infrastructure.Tests.Authentication;

public class CredentialLoginServiceTests
{
    [Fact]
    public async Task Correct_credentials_start_an_authenticated_session()
    {
        using var harness = new AuthenticationTestHarness();
        await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("login.user@example.com", "Password1", "Password1", "Login User"),
            CancellationToken.None);

        var httpContext = new DefaultHttpContext();
        var loginService = harness.BuildCredentialLoginService(httpContext);

        var loggedIn = await loginService.SignInWithPasswordAsync(
            new LoginRequest("login.user@example.com", "Password1", RememberMe: false),
            CancellationToken.None);

        Assert.Equal("login.user@example.com", loggedIn.Email);
        Assert.True(httpContext.User.Identity?.IsAuthenticated);
    }

    [Fact]
    public async Task Wrong_password_is_rejected_with_the_FSD_generic_message()
    {
        using var harness = new AuthenticationTestHarness();
        await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("wrong.password@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        var loginService = harness.BuildCredentialLoginService(new DefaultHttpContext());

        var exception = await Assert.ThrowsAsync<UnauthorizedException>(() => loginService.SignInWithPasswordAsync(
            new LoginRequest("wrong.password@example.com", "WrongPassword1", RememberMe: false),
            CancellationToken.None));

        Assert.Equal("Incorrect email or password.", exception.Message);
    }

    [Fact]
    public async Task Unknown_email_is_rejected_with_the_exact_same_message_as_a_wrong_password()
    {
        // FSD 8: do not expose whether a particular email exists - this must be indistinguishable
        // from Wrong_password_is_rejected_with_the_FSD_generic_message above.
        using var harness = new AuthenticationTestHarness();
        var loginService = harness.BuildCredentialLoginService(new DefaultHttpContext());

        var exception = await Assert.ThrowsAsync<UnauthorizedException>(() => loginService.SignInWithPasswordAsync(
            new LoginRequest("no.such.account@example.com", "SomePassword1", RememberMe: false),
            CancellationToken.None));

        Assert.Equal("Incorrect email or password.", exception.Message);
    }

    [Fact]
    public async Task Remember_me_issues_a_persistent_cookie_while_its_absence_issues_a_session_cookie()
    {
        using var harness = new AuthenticationTestHarness();
        await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("remember.me@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        var rememberedContext = new DefaultHttpContext();
        await harness.BuildCredentialLoginService(rememberedContext).SignInWithPasswordAsync(
            new LoginRequest("remember.me@example.com", "Password1", RememberMe: true),
            CancellationToken.None);

        var sessionContext = new DefaultHttpContext();
        await harness.BuildCredentialLoginService(sessionContext).SignInWithPasswordAsync(
            new LoginRequest("remember.me@example.com", "Password1", RememberMe: false),
            CancellationToken.None);

        var rememberedCookie = rememberedContext.Response.Headers.SetCookie.ToString();
        var sessionCookie = sessionContext.Response.Headers.SetCookie.ToString();

        // A persistent cookie carries an explicit expiry; a session cookie does not.
        Assert.Contains("expires=", rememberedCookie, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("expires=", sessionCookie, StringComparison.OrdinalIgnoreCase);
    }
}
