namespace InvoiceApp.Application.Email;

public sealed record EmailAttachment(string FileName, string ContentType, byte[] Content);

/// <summary>
/// A fully-formed, transport-agnostic email - IEmailSender's implementations only ever move bytes
/// over SMTP (or log them, in dev), they never decide subject lines or body copy. Deliberately
/// generic (unlike IPasswordResetEmailSender, hardcoded to that one template/flow) so this same
/// abstraction can back any future email use case, not just IG-212's invoice-sending.
/// </summary>
public sealed record EmailMessage(
    IReadOnlyList<string> To,
    IReadOnlyList<string> Cc,
    string Subject,
    string PlainTextBody,
    string HtmlBody,
    IReadOnlyList<EmailAttachment> Attachments,
    string? ReplyTo = null);
