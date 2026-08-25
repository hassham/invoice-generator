using InvoiceApp.Application.Identity;

namespace InvoiceApp.Api.Tests.Authentication;

/// <summary>
/// Captures what PasswordResetService would have "sent" instead of writing it to the app log
/// (LoggingPasswordResetEmailSender's real behavior) - HTTP-level tests need the token back so
/// they can feed it into a subsequent POST to /reset-password.
/// </summary>
public sealed class FakePasswordResetEmailSender : IPasswordResetEmailSender
{
    public List<(string Email, string Token)> SentMessages { get; } = [];

    public Task SendAsync(string email, string token, CancellationToken cancellationToken)
    {
        SentMessages.Add((email, token));
        return Task.CompletedTask;
    }
}
