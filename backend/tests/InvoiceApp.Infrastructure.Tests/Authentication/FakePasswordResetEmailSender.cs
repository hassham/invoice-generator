using InvoiceApp.Application.Identity;

namespace InvoiceApp.Infrastructure.Tests.Authentication;

/// <summary>
/// Captures what PasswordResetService would have "sent" instead of writing it to the app log
/// (LoggingPasswordResetEmailSender's real behavior) - tests need the token back so they can feed
/// it into a subsequent reset call.
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
