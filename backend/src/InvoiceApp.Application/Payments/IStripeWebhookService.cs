namespace InvoiceApp.Application.Payments;

/// <summary>
/// IG-217: parses and verifies an inbound Stripe webhook - only an Infrastructure implementation
/// may reference the Stripe.net SDK directly (docs/SAD.md: "the module must not directly depend on
/// Stripe-specific models"), so this returns this app's own Stripe-agnostic result shape.
/// </summary>
public interface IStripeWebhookService
{
    /// <summary>Verifies the payload's HMAC signature before trusting anything in it - an
    /// unsigned/invalid/tampered request never reaches IsValid true, regardless of what it
    /// claims. A validly-signed event of a type this app doesn't act on (anything but a Checkout
    /// Session completing) still returns IsValid true, with SessionId/PublicTokenMetadata/IsPaid
    /// left at their defaults, so the caller can ack it with 200 rather than retry it forever.</summary>
    StripeWebhookParseResult ParseEvent(string payload, string signatureHeader);
}

public sealed record StripeWebhookParseResult(bool IsValid, string? SessionId, string? PublicTokenMetadata, bool IsPaid, decimal? AmountTotal);
