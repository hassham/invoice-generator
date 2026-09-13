using System.Net;
using InvoiceApp.Application.Email;
using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Modules.Invoicing;

/// <summary>
/// IG-212: combines the sender's own Recipient/CC/Subject/Message with the two things the system
/// adds automatically (docs/PRD.md section 11: "System attaches PDF and provides a hosted invoice
/// link") into one EmailMessage IEmailSender can send as-is. Pure and separately unit-testable
/// without a real SMTP connection or MimeMessage - same precedent as
/// SmtpPasswordResetEmailSender.BuildMessageContent.
/// </summary>
public static class InvoiceEmailMessageBuilder
{
    public static EmailMessage Build(InvoiceEmailRequest request, string hostedLink, byte[] pdfBytes, string pdfFileName, string? replyTo)
    {
        var plainTextBody = $"""
            {request.Message}

            View your invoice online: {hostedLink}
            """;
        // The sender's own Message is free text a real person typed, not developer-authored copy -
        // must be HTML-encoded before it ever lands in an HTML email body (the one part of this
        // email a malicious/careless sender actually controls the content of).
        var htmlBody = $"""
            <p>{WebUtility.HtmlEncode(request.Message).Replace("\n", "<br />")}</p>
            <p><a href="{WebUtility.HtmlEncode(hostedLink)}">View your invoice online</a></p>
            """;

        return new EmailMessage(
            request.To,
            request.Cc,
            request.Subject,
            plainTextBody,
            htmlBody,
            [new EmailAttachment(pdfFileName, "application/pdf", pdfBytes)],
            replyTo);
    }
}
