using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;

namespace InvoiceApp.Infrastructure.Tests.Authentication;

public class AccountDeletionServiceTests
{
    [Fact]
    public async Task Correct_password_soft_deletes_the_account_and_signs_out_the_session()
    {
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("delete.me@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        var httpContext = new DefaultHttpContext();
        await harness.BuildAuthSessionService(httpContext).SignInAsync(registered.UserId, CancellationToken.None);

        await harness.BuildAccountDeletionService(httpContext)
            .DeleteAsync(registered.UserId, "Password1", CancellationToken.None);

        var user = await harness.UserManager.FindByIdAsync(registered.UserId.ToString());
        Assert.Equal("Deleted", user?.Status);

        // A deleted cookie carries an expiry in the past, same signal used for the plain
        // sign-out case in AuthSessionServiceTests.
        var setCookie = httpContext.Response.Headers.SetCookie.ToString();
        Assert.Contains("expires=Thu, 01 Jan 1970", setCookie, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Correct_password_writes_an_audit_log_entry()
    {
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("audited.delete@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        var httpContext = new DefaultHttpContext();
        await harness.BuildAuthSessionService(httpContext).SignInAsync(registered.UserId, CancellationToken.None);

        await harness.BuildAccountDeletionService(httpContext)
            .DeleteAsync(registered.UserId, "Password1", CancellationToken.None);

        var auditLog = Assert.Single(harness.DbContext.AuditLogs);
        Assert.Equal(registered.UserId, auditLog.UserId);
        Assert.Equal("Account", auditLog.EntityType);
        Assert.Equal(registered.UserId, auditLog.EntityId);
        Assert.Equal("AccountDeleted", auditLog.Action);
    }

    [Fact]
    public async Task Wrong_password_is_rejected_and_the_account_is_not_deleted()
    {
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("wrong.delete.password@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        var deletionService = harness.BuildAccountDeletionService(new DefaultHttpContext());

        var exception = await Assert.ThrowsAsync<UnauthorizedException>(
            () => deletionService.DeleteAsync(registered.UserId, "WrongPassword1", CancellationToken.None));

        Assert.Equal("Incorrect password.", exception.Message);

        var user = await harness.UserManager.FindByIdAsync(registered.UserId.ToString());
        Assert.Equal("Active", user?.Status);
        Assert.Empty(harness.DbContext.AuditLogs);
    }

    [Fact]
    public async Task Unknown_user_id_is_rejected()
    {
        using var harness = new AuthenticationTestHarness();
        var deletionService = harness.BuildAccountDeletionService(new DefaultHttpContext());

        await Assert.ThrowsAsync<NotFoundException>(
            () => deletionService.DeleteAsync(Guid.NewGuid(), "Password1", CancellationToken.None));
    }
}
