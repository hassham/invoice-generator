using System.Net;
using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace InvoiceApp.Infrastructure.Authentication;

/// <summary>
/// Real transactional email delivery for password reset, via any standard SMTP provider (see
/// SmtpOptions' own doc comment). Only registered in place of LoggingPasswordResetEmailSender when
/// SmtpOptions.Host is actually configured (InfrastructureAuthenticationExtensions) - every
/// environment without real credentials keeps using the dev-only log stub, unchanged.
/// </summary>
public sealed class SmtpPasswordResetEmailSender(
    IOptions<SmtpOptions> smtpOptions,
    IConfiguration configuration,
    ILogger<SmtpPasswordResetEmailSender> logger) : IPasswordResetEmailSender
{
    public async Task SendAsync(string email, string token, CancellationToken cancellationToken)
    {
        var options = smtpOptions.Value;
        var frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var content = BuildMessageContent(email, token, frontendBaseUrl);

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(options.FromName, options.FromAddress));
        message.To.Add(MailboxAddress.Parse(email));
        message.Subject = content.Subject;
        message.Body = new BodyBuilder { TextBody = content.PlainTextBody, HtmlBody = content.HtmlBody }.ToMessageBody();

        using var client = new SmtpClient();
        try
        {
            await client.ConnectAsync(options.Host, options.Port, options.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.SslOnConnect, cancellationToken);
            if (!string.IsNullOrEmpty(options.Username))
            {
                await client.AuthenticateAsync(options.Username, options.Password, cancellationToken);
            }
            await client.SendAsync(message, cancellationToken);
        }
        finally
        {
            if (client.IsConnected)
            {
                await client.DisconnectAsync(true, cancellationToken);
            }
        }

        // Never logs the token itself (unlike the dev-only stub this replaces) - FSD section 123:
        // "Do not log: ... sensitive credentials". A reset token is exactly that.
        logger.LogInformation("Password reset email sent to {Email}.", email);
    }

    public readonly record struct MessageContent(string Subject, string PlainTextBody, string HtmlBody);

    /// <summary>Pure and separately unit-testable without a real SMTP connection or MimeMessage.</summary>
    public static MessageContent BuildMessageContent(string email, string token, string frontendBaseUrl)
    {
        var resetLink = $"{frontendBaseUrl}/reset-password?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
        const string subject = "Reset your Invoice App password";
        var plainTextBody = $"""
            We received a request to reset your Invoice App password.

            Reset your password: {resetLink}

            If you didn't request this, you can safely ignore this email - your password won't be changed.
            """;
        var htmlBody = $"""
            <p>We received a request to reset your Invoice App password.</p>
            <p><a href="{WebUtility.HtmlEncode(resetLink)}">Reset your password</a></p>
            <p>If you didn't request this, you can safely ignore this email - your password won't be changed.</p>
            """;

        return new MessageContent(subject, plainTextBody, htmlBody);
    }
}
