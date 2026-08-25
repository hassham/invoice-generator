using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using Microsoft.AspNetCore.Http;

namespace InvoiceApp.Infrastructure.Tests.Authentication;

public class ExternalLoginServiceTests
{
    private const string Provider = "Google";

    [Fact]
    public async Task New_identity_with_no_matching_account_creates_one_and_signs_in()
    {
        using var harness = new AuthenticationTestHarness();
        var httpContext = new DefaultHttpContext();
        var service = harness.BuildExternalLoginService(httpContext);

        var loggedIn = await service.SignInOrRegisterAsync(
            new ExternalLoginRequest(Provider, "google-user-1", "new.google.user@example.com", "New Google User", EmailVerified: true),
            CancellationToken.None);

        Assert.Equal("new.google.user@example.com", loggedIn.Email);
        Assert.Equal("New Google User", loggedIn.Name);
        Assert.True(httpContext.User.Identity?.IsAuthenticated);

        var user = await harness.UserManager.FindByEmailAsync("new.google.user@example.com");
        Assert.NotNull(user);
        Assert.Equal("Active", user!.Status);
    }

    [Fact]
    public async Task New_identity_matching_an_existing_verified_email_links_instead_of_duplicating()
    {
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("existing.account@example.com", "Password1", "Password1", "Existing User"),
            CancellationToken.None);

        var loggedIn = await harness.BuildExternalLoginService(new DefaultHttpContext())
            .SignInOrRegisterAsync(
                new ExternalLoginRequest(Provider, "google-user-2", "existing.account@example.com", "Existing User", EmailVerified: true),
                CancellationToken.None);

        Assert.Equal(registered.UserId, loggedIn.UserId);

        var matchingUsers = harness.DbContext.Users.Where(u => u.Email == "existing.account@example.com");
        Assert.Single(matchingUsers);
    }

    [Fact]
    public async Task New_identity_matching_an_existing_account_by_unverified_email_is_rejected_without_linking()
    {
        using var harness = new AuthenticationTestHarness();
        await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("unverified.match@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        var service = harness.BuildExternalLoginService(new DefaultHttpContext());

        await Assert.ThrowsAsync<ValidationException>(() => service.SignInOrRegisterAsync(
            new ExternalLoginRequest(Provider, "google-user-3", "unverified.match@example.com", null, EmailVerified: false),
            CancellationToken.None));

        var user = await harness.UserManager.FindByEmailAsync("unverified.match@example.com");
        Assert.Null(await harness.UserManager.FindByLoginAsync(Provider, "google-user-3"));
        Assert.NotNull(user);
    }

    [Fact]
    public async Task An_already_linked_identity_signs_in_without_creating_a_second_account()
    {
        using var harness = new AuthenticationTestHarness();
        var first = await harness.BuildExternalLoginService(new DefaultHttpContext())
            .SignInOrRegisterAsync(
                new ExternalLoginRequest(Provider, "google-user-4", "repeat.signin@example.com", "Repeat User", EmailVerified: true),
                CancellationToken.None);

        var second = await harness.BuildExternalLoginService(new DefaultHttpContext())
            .SignInOrRegisterAsync(
                new ExternalLoginRequest(Provider, "google-user-4", "repeat.signin@example.com", "Repeat User", EmailVerified: true),
                CancellationToken.None);

        Assert.Equal(first.UserId, second.UserId);
        Assert.Single(harness.DbContext.Users.Where(u => u.Email == "repeat.signin@example.com"));
    }

    [Fact]
    public async Task Missing_email_on_a_brand_new_identity_is_rejected()
    {
        using var harness = new AuthenticationTestHarness();
        var service = harness.BuildExternalLoginService(new DefaultHttpContext());

        await Assert.ThrowsAsync<ValidationException>(() => service.SignInOrRegisterAsync(
            new ExternalLoginRequest(Provider, "google-user-5", Email: null, Name: null, EmailVerified: false),
            CancellationToken.None));
    }

    [Fact]
    public async Task A_deleted_account_linked_to_the_identity_is_rejected()
    {
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("deleted.google.user@example.com", "Password1", "Password1", null),
            CancellationToken.None);
        await harness.BuildExternalLoginService(new DefaultHttpContext())
            .SignInOrRegisterAsync(
                new ExternalLoginRequest(Provider, "google-user-6", "deleted.google.user@example.com", null, EmailVerified: true),
                CancellationToken.None);
        await harness.BuildAccountDeletionService(new DefaultHttpContext())
            .DeleteAsync(registered.UserId, "Password1", CancellationToken.None);

        var service = harness.BuildExternalLoginService(new DefaultHttpContext());

        var exception = await Assert.ThrowsAsync<UnauthorizedException>(() => service.SignInOrRegisterAsync(
            new ExternalLoginRequest(Provider, "google-user-6", "deleted.google.user@example.com", null, EmailVerified: true),
            CancellationToken.None));

        Assert.Equal("This account is no longer available.", exception.Message);
    }
}
