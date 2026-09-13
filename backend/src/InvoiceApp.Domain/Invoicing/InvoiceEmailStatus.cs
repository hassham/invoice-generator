namespace InvoiceApp.Domain.Invoicing;

/// <summary>
/// IG-213: "delivery status" scoped to what a generic SMTP send can actually report - whether it
/// was successfully handed off, or the attempt failed. Real delivery/bounce confirmation would
/// need a provider-specific webhook integration (SendGrid/Postmark/SES event webhooks), which this
/// app's provider-agnostic SmtpOptions deliberately doesn't commit to any one of - out of scope
/// here, not an oversight.
/// </summary>
public enum InvoiceEmailStatus
{
    Sent,
    Failed,
}
