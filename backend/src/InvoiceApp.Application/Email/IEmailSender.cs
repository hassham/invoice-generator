namespace InvoiceApp.Application.Email;

/// <summary>
/// Sends an arbitrary, already-composed email. The only implementations are a dev-only log stub
/// (LoggingEmailSender) and a real SMTP sender (SmtpEmailSender) - same "swap implementation, not
/// callers" precedent as IPasswordResetEmailSender, kept as a separate interface rather than
/// extending that one since password-reset's fixed (email, token) signature has no use for
/// arbitrary recipients/subject/attachments.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken);
}
