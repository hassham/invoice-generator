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
}
