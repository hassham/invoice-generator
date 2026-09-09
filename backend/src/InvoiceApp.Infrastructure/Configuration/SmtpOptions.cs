namespace InvoiceApp.Infrastructure.Configuration;

/// <summary>
/// Governs real transactional email delivery (currently just password-reset). Left blank by
/// default - matches GoogleAuthenticationOptions' own precedent: not validated on startup, since
/// every non-production environment (local dev without a mail provider set up yet, CI, tests)
/// must still start and run normally with these left blank, falling back to
/// LoggingPasswordResetEmailSender's dev-only console stub (see
/// InfrastructureAuthenticationExtensions' conditional registration). Portable across any SMTP
/// provider (Gmail, SendGrid, Postmark, AWS SES, a self-hosted server, ...) rather than a
/// vendor-specific API, so switching providers only ever means changing configuration values, not
/// code.
/// </summary>
public sealed class SmtpOptions
{
    // "Email", not "Smtp": docs/SAD.md section 67 lists "Email__Provider" as the anticipated config
// path for this exact concern, and InvoiceApp.Infrastructure.Tests.Configuration.SecretsHygieneTests
// already checks for a committed "Email" section in appsettings.json - naming it this way gets
// that guard for free rather than needing its own separate one.
public const string SectionName = "Email";

    public string Host { get; init; } = string.Empty;

    public int Port { get; init; } = 587;

    public string Username { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public string FromAddress { get; init; } = string.Empty;

    public string FromName { get; init; } = "Invoice App";

    // STARTTLS on 587 is the near-universal default across providers; only Port 465 (implicit
    // TLS) needs this false - see SmtpPasswordResetEmailSender's own comment on how this maps to
    // MailKit's SecureSocketOptions.
    public bool UseStartTls { get; init; } = true;
}
