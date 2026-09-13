using InvoiceApp.Application.Email;

namespace InvoiceApp.Api.Tests.Authentication;

/// <summary>
/// Captures what would have been sent instead of writing it to the app log (LoggingEmailSender's
/// real behavior) - IG-212's HTTP-level tests need the actual EmailMessage back to assert on
/// recipients/subject/attachments, which a log line can't hand back. Same precedent as
/// FakePasswordResetEmailSender.
/// </summary>
public sealed class FakeEmailSender : IEmailSender
{
    public List<EmailMessage> SentMessages { get; } = [];

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        SentMessages.Add(message);
        return Task.CompletedTask;
    }
}
