using InvoiceApp.Application.Email;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Email;

/// <summary>
/// Dev-only stand-in for a real transactional email provider - same reasoning as
/// InvoiceApp.Infrastructure.Authentication.LoggingPasswordResetEmailSender (which this
/// deliberately doesn't touch or replace). Logs recipients/subject/attachment names only, never
/// body content - an invoice's Notes/Terms/line items could contain anything the sender typed,
/// and this is app-log output, not a place to echo a customer-facing document back into.
/// </summary>
public sealed class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Email requested (dev-only - never sent, log stub only). To: {To}, Cc: {Cc}, Subject: {Subject}, Attachments: {Attachments}",
            string.Join(", ", message.To),
            string.Join(", ", message.Cc),
            message.Subject,
            string.Join(", ", message.Attachments.Select(a => a.FileName)));

        return Task.CompletedTask;
    }
}
