using InvoiceApp.Application.Email;
using InvoiceApp.Infrastructure.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace InvoiceApp.Infrastructure.Email;

/// <summary>
/// Real transactional email delivery for any EmailMessage, via any standard SMTP provider (reuses
/// SmtpOptions - already named for the "Email" config section generically, not
/// "PasswordResetEmail", so no new configuration surface is needed). Only registered in place of
/// LoggingEmailSender when SmtpOptions.Host is actually configured
/// (InfrastructureEmailExtensions) - same precedent as SmtpPasswordResetEmailSender, which this
/// deliberately doesn't touch or replace (a fixed (email, token) signature has no use for this
/// generic one).
/// </summary>
public sealed class SmtpEmailSender(IOptions<SmtpOptions> smtpOptions, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        var options = smtpOptions.Value;

        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(options.FromName, options.FromAddress));
        foreach (var to in message.To)
        {
            mime.To.Add(MailboxAddress.Parse(to));
        }
        foreach (var cc in message.Cc)
        {
            mime.Cc.Add(MailboxAddress.Parse(cc));
        }
        if (!string.IsNullOrWhiteSpace(message.ReplyTo))
        {
            mime.ReplyTo.Add(MailboxAddress.Parse(message.ReplyTo));
        }
        mime.Subject = message.Subject;

        var bodyBuilder = new BodyBuilder { TextBody = message.PlainTextBody, HtmlBody = message.HtmlBody };
        foreach (var attachment in message.Attachments)
        {
            bodyBuilder.Attachments.Add(attachment.FileName, attachment.Content, ContentType.Parse(attachment.ContentType));
        }
        mime.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        try
        {
            await client.ConnectAsync(options.Host, options.Port, options.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.SslOnConnect, cancellationToken);
            if (!string.IsNullOrEmpty(options.Username))
            {
                await client.AuthenticateAsync(options.Username, options.Password, cancellationToken);
            }
            await client.SendAsync(mime, cancellationToken);
        }
        finally
        {
            if (client.IsConnected)
            {
                await client.DisconnectAsync(true, cancellationToken);
            }
        }

        // Recipients only, never subject/body - same "don't echo a customer-facing document into
        // app logs" reasoning as LoggingEmailSender.
        logger.LogInformation("Email sent to {To} (cc: {Cc}).", string.Join(", ", message.To), string.Join(", ", message.Cc));
    }
}
