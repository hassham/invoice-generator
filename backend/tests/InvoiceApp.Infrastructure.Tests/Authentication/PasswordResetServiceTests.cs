using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;

namespace InvoiceApp.Infrastructure.Tests.Authentication;

public class PasswordResetServiceTests
{
    private const string InvalidTokenMessage = "This reset link is invalid or has expired. Please request a new one.";

    [Fact]
    public async Task Requesting_a_reset_for_a_known_active_email_sends_exactly_one_token()
    {
        using var harness = new AuthenticationTestHarness();
        await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("reset.me@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        await harness.PasswordResetService.RequestResetAsync("reset.me@example.com", CancellationToken.None);

        var message = Assert.Single(harness.EmailSender.SentMessages);
        Assert.Equal("reset.me@example.com", message.Email);
        Assert.False(string.IsNullOrWhiteSpace(message.Token));
    }

    [Fact]
    public async Task Requesting_a_reset_for_an_unknown_email_sends_nothing_and_does_not_throw()
    {
        using var harness = new AuthenticationTestHarness();

        await harness.PasswordResetService.RequestResetAsync("nobody@example.com", CancellationToken.None);

        Assert.Empty(harness.EmailSender.SentMessages);
    }

    [Fact]
    public async Task Requesting_a_reset_for_a_deleted_account_sends_nothing_and_does_not_throw()
    {
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("deleted.reset@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        var user = await harness.UserManager.FindByIdAsync(registered.UserId.ToString());
        user!.Status = "Deleted";
        await harness.UserManager.UpdateAsync(user);

        await harness.PasswordResetService.RequestResetAsync("deleted.reset@example.com", CancellationToken.None);

        Assert.Empty(harness.EmailSender.SentMessages);
    }

    [Fact]
    public async Task A_valid_token_resets_the_password_and_the_new_password_can_log_in()
    {
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("valid.reset@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        await harness.PasswordResetService.RequestResetAsync("valid.reset@example.com", CancellationToken.None);
        var token = harness.EmailSender.SentMessages[0].Token;

        await harness.PasswordResetService.ResetPasswordAsync(
            new ResetPasswordRequest("valid.reset@example.com", token, "NewPassword1", "NewPassword1"),
            CancellationToken.None);

        var user = await harness.UserManager.FindByIdAsync(registered.UserId.ToString());
        Assert.True(await harness.UserManager.CheckPasswordAsync(user!, "NewPassword1"));
        Assert.False(await harness.UserManager.CheckPasswordAsync(user!, "Password1"));
    }

    [Fact]
    public async Task A_used_token_is_rejected_on_a_second_reset_attempt()
    {
        using var harness = new AuthenticationTestHarness();
        await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("reused.token@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        await harness.PasswordResetService.RequestResetAsync("reused.token@example.com", CancellationToken.None);
        var token = harness.EmailSender.SentMessages[0].Token;

        await harness.PasswordResetService.ResetPasswordAsync(
            new ResetPasswordRequest("reused.token@example.com", token, "NewPassword1", "NewPassword1"),
            CancellationToken.None);

        // Resetting rotates the account's security stamp, which is what the token is bound to -
        // the exact same token string must fail the second time even though it was well-formed
        // and unexpired (IG-98: "reused ... token cases remain safe").
        var exception = await Assert.ThrowsAsync<ValidationException>(() => harness.PasswordResetService.ResetPasswordAsync(
            new ResetPasswordRequest("reused.token@example.com", token, "AnotherPassword1", "AnotherPassword1"),
            CancellationToken.None));

        Assert.Equal(InvalidTokenMessage, exception.Message);
    }

    [Fact]
    public async Task A_malformed_token_is_rejected_with_the_generic_message()
    {
        using var harness = new AuthenticationTestHarness();
        await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("malformed.token@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        var exception = await Assert.ThrowsAsync<ValidationException>(() => harness.PasswordResetService.ResetPasswordAsync(
            new ResetPasswordRequest("malformed.token@example.com", "not-a-real-token", "NewPassword1", "NewPassword1"),
            CancellationToken.None));

        Assert.Equal(InvalidTokenMessage, exception.Message);
    }

    [Fact]
    public async Task An_expired_token_is_rejected_with_the_generic_message()
    {
        using var harness = new AuthenticationTestHarness(passwordResetTokenLifespanOverride: TimeSpan.FromMilliseconds(50));
        await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("expired.token@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        await harness.PasswordResetService.RequestResetAsync("expired.token@example.com", CancellationToken.None);
        var token = harness.EmailSender.SentMessages[0].Token;

        await Task.Delay(TimeSpan.FromMilliseconds(300));

        var exception = await Assert.ThrowsAsync<ValidationException>(() => harness.PasswordResetService.ResetPasswordAsync(
            new ResetPasswordRequest("expired.token@example.com", token, "NewPassword1", "NewPassword1"),
            CancellationToken.None));

        Assert.Equal(InvalidTokenMessage, exception.Message);
    }

    [Fact]
    public async Task Resetting_for_an_unknown_email_is_rejected_with_the_same_generic_message_as_an_invalid_token()
    {
        using var harness = new AuthenticationTestHarness();

        var exception = await Assert.ThrowsAsync<ValidationException>(() => harness.PasswordResetService.ResetPasswordAsync(
            new ResetPasswordRequest("nobody@example.com", "any-token", "NewPassword1", "NewPassword1"),
            CancellationToken.None));

        Assert.Equal(InvalidTokenMessage, exception.Message);
    }

    [Fact]
    public async Task A_token_generated_before_deletion_is_rejected_once_the_account_is_deleted()
    {
        using var harness = new AuthenticationTestHarness();
        var registered = await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("deleted.after.token@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        await harness.PasswordResetService.RequestResetAsync("deleted.after.token@example.com", CancellationToken.None);
        var token = harness.EmailSender.SentMessages[0].Token;

        var user = await harness.UserManager.FindByIdAsync(registered.UserId.ToString());
        user!.Status = "Deleted";
        await harness.UserManager.UpdateAsync(user);

        var exception = await Assert.ThrowsAsync<ValidationException>(() => harness.PasswordResetService.ResetPasswordAsync(
            new ResetPasswordRequest("deleted.after.token@example.com", token, "NewPassword1", "NewPassword1"),
            CancellationToken.None));

        Assert.Equal(InvalidTokenMessage, exception.Message);
    }

    [Fact]
    public async Task A_new_password_that_fails_the_password_policy_is_rejected_with_a_specific_message()
    {
        using var harness = new AuthenticationTestHarness();
        await harness.AccountRegistrationService.RegisterAsync(
            new RegisterAccountRequest("weak.new.password@example.com", "Password1", "Password1", null),
            CancellationToken.None);

        await harness.PasswordResetService.RequestResetAsync("weak.new.password@example.com", CancellationToken.None);
        var token = harness.EmailSender.SentMessages[0].Token;

        var exception = await Assert.ThrowsAsync<ValidationException>(() => harness.PasswordResetService.ResetPasswordAsync(
            new ResetPasswordRequest("weak.new.password@example.com", token, "short", "short"),
            CancellationToken.None));

        Assert.NotEqual(InvalidTokenMessage, exception.Message);
    }
}
