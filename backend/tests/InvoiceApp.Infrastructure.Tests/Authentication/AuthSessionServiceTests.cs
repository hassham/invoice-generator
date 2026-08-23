using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using Microsoft.AspNetCore.Http;

namespace InvoiceApp.Infrastructure.Tests.Authentication;

public class AuthSessionServiceTests
{
    [Fact]
    public async Task Signing_in_an_existing_user_authenticates_the_current_HttpContext()
    {
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("session.user@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        var httpContext = new DefaultHttpContext();
        var authSessionService = harness.BuildAuthSessionService(httpContext);

        await authSessionService.SignInAsync(registered.UserId, CancellationToken.None);

        Assert.True(httpContext.User.Identity?.IsAuthenticated);
    }

    [Fact]
    public async Task Signing_in_an_unknown_user_id_fails_safely_instead_of_authenticating_nothing()
    {
        using var harness = new AuthenticationTestHarness();
        var authSessionService = harness.BuildAuthSessionService(new DefaultHttpContext());

        await Assert.ThrowsAsync<NotFoundException>(
            () => authSessionService.SignInAsync(Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public async Task Signing_out_instructs_the_browser_to_delete_the_session_cookie()
    {
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("signout.user@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        var httpContext = new DefaultHttpContext();
        var authSessionService = harness.BuildAuthSessionService(httpContext);
        await authSessionService.SignInAsync(registered.UserId, CancellationToken.None);

        await authSessionService.SignOutAsync(CancellationToken.None);

        // A deleted cookie carries an expiry in the past (the standard client-side deletion
        // mechanism - HttpContext.User is not reliably updated mid-request by SignOutAsync, so
        // asserting on the outgoing cookie is the correct signal, not IsAuthenticated).
        var setCookie = httpContext.Response.Headers.SetCookie.ToString();
        Assert.Contains("expires=Thu, 01 Jan 1970", setCookie, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetCurrentAsync_returns_the_accounts_own_display_name_not_its_username()
    {
        // Regression coverage for a real bug caught during manual verification: Identity's
        // default ClaimTypes.Name claim reflects UserName (the email, in this app), so an
        // endpoint reading it directly returned the email as "name" instead of the value the
        // user actually gave at registration.
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("display.name@example.com", "Password1", "Password1", "Actual Display Name"),
            CancellationToken.None);

        var account = await harness.BuildAuthSessionService(new DefaultHttpContext())
            .GetCurrentAsync(registered.UserId, CancellationToken.None);

        Assert.Equal("Actual Display Name", account?.Name);
        Assert.NotEqual("display.name@example.com", account?.Name);
    }

    [Fact]
    public async Task GetCurrentAsync_returns_null_for_an_unknown_user_id()
    {
        using var harness = new AuthenticationTestHarness();

        var account = await harness.BuildAuthSessionService(new DefaultHttpContext())
            .GetCurrentAsync(Guid.NewGuid(), CancellationToken.None);

        Assert.Null(account);
    }
}
