using InvoiceApp.Application.Identity;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Authentication;

/// <summary>
/// Dev-only stand-in for a real transactional email provider (SendGrid/SES/etc. - tracked as a
/// follow-up, see the IG-25 Jira comment). Writes the reset token straight to the app log so the
/// full request-to-reset flow can be smoke-tested locally without any external account or SMTP
/// setup. This necessarily puts a live, single-use credential (the reset token) in plaintext
/// application logs, which a real email sender would never do - do not reuse this implementation
/// outside local/dev environments.
/// </summary>
public sealed class LoggingPasswordResetEmailSender(ILogger<LoggingPasswordResetEmailSender> logger) : IPasswordResetEmailSender
{
    public Task SendAsync(string email, string token, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Password reset requested for {Email}. Dev-only reset token (never emailed - log stub only): {Token}",
            email,
            token);

        return Task.CompletedTask;
    }
}
