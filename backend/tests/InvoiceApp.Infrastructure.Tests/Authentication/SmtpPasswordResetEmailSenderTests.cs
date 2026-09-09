using InvoiceApp.Infrastructure.Authentication;

namespace InvoiceApp.Infrastructure.Tests.Authentication;

/// <summary>
/// Covers BuildMessageContent only - the pure, non-networked half of
/// SmtpPasswordResetEmailSender. SendAsync itself needs a real SMTP connection and is exercised
/// manually against a real provider instead (see backend/README.md's Secrets section).
/// </summary>
public class SmtpPasswordResetEmailSenderTests
{
    [Fact]
    public void Reset_link_carries_the_email_and_token_as_query_parameters()
    {
        var content = SmtpPasswordResetEmailSender.BuildMessageContent(
            "user@example.com", "abc123", "http://localhost:3000");

        var expectedLink = "http://localhost:3000/reset-password?email=user%40example.com&token=abc123";
        Assert.Contains(expectedLink, content.PlainTextBody, StringComparison.Ordinal);
        // HtmlBody HTML-encodes the link (& becomes &amp;) - checked separately below.
        Assert.Contains(System.Net.WebUtility.HtmlEncode(expectedLink), content.HtmlBody, StringComparison.Ordinal);
    }

    [Fact]
    public void Email_and_token_are_escaped_for_use_in_a_url()
    {
        var content = SmtpPasswordResetEmailSender.BuildMessageContent(
            "user+test@example.com", "token with spaces", "http://localhost:3000");

        Assert.Contains("email=user%2Btest%40example.com", content.PlainTextBody, StringComparison.Ordinal);
        Assert.Contains("token=token%20with%20spaces", content.PlainTextBody, StringComparison.Ordinal);
    }

    [Fact]
    public void Html_body_encodes_the_link_to_prevent_markup_injection()
    {
        // A token is server-generated (never user free text) so this can't be exploited today,
        // but HtmlEncode-ing the link is what actually stops it from ever becoming one.
        var content = SmtpPasswordResetEmailSender.BuildMessageContent(
            "user@example.com", "\"><script>alert(1)</script>", "http://localhost:3000");

        Assert.DoesNotContain("<script>", content.HtmlBody, StringComparison.Ordinal);
    }

    [Fact]
    public void Subject_does_not_leak_the_token()
    {
        var content = SmtpPasswordResetEmailSender.BuildMessageContent(
            "user@example.com", "super-secret-token", "http://localhost:3000");

        Assert.DoesNotContain("super-secret-token", content.Subject, StringComparison.Ordinal);
    }
}
