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
    public async Task Deleted_account_is_rejected_with_the_same_generic_message_as_a_wrong_password()
    {
        // The "not left signed in" half of this behavior (PasswordSignInAsync issues a cookie
        // before the Status check runs, so CredentialLoginService must undo it) is proven for
        // real in AccountDeletionTests.Deleted_account_cannot_log_in_again, which exercises the
        // actual Api pipeline end to end. It isn't re-asserted at the cookie-header level here:
        // this harness reuses one DI scope across every Build* call, and IAuthenticationHandlerProvider
        // is scoped, not per-HttpContext - deletion below is the *first* real cookie operation in
        // this test's scope, so it captures the handler against its own throwaway HttpContext;
        // the later PasswordSignInAsync call then silently writes to that same stale handler
        // instead of this test's own httpContext, making a cookie-header assertion here
        // unreliable (production's real per-request DI scope has no such artifact).
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("deleted.login@example.com", "Password1", "Password1", null),
            CancellationToken.None);
        await harness.BuildAccountDeletionService(new DefaultHttpContext())
            .DeleteAsync(registered.UserId, "Password1", CancellationToken.None);

        var loginService = harness.BuildCredentialLoginService(new DefaultHttpContext());

        var exception = await Assert.ThrowsAsync<UnauthorizedException>(() => loginService.SignInWithPasswordAsync(
            new LoginRequest("deleted.login@example.com", "Password1", RememberMe: false),
            CancellationToken.None));

        // Same message as a wrong password/unknown email - a deleted account's state must not be
        // exposed via a distinct error (FSD 8's anti-enumeration requirement extended to deletion).
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
