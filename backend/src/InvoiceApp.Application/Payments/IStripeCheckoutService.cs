namespace InvoiceApp.Application.Payments;

/// <summary>
/// IG-216: the Stripe-facing half of "pay a hosted invoice online" - deliberately separate from
/// IStripeConnectService, whose own doc comment scopes it specifically to the OAuth handshake
/// (IG-219), not payment collection. Only Infrastructure implementations may reference the
/// Stripe.net SDK directly (docs/SAD.md: "the module must not directly depend on Stripe-specific
/// models") - these request/result types are this app's own, Stripe-agnostic shapes.
/// </summary>
public interface IStripeCheckoutService
{
    /// <summary>Opens a Checkout Session directly on the connected account (Stripe Connect
    /// "Standard" accounts use direct charges, not destination charges - see
    /// StripeConnectService's own OAuth scope) for the exact outstanding amount.</summary>
    Task<StripeCheckoutSessionResult> CreateSessionAsync(StripeCheckoutSessionRequest request, CancellationToken cancellationToken);

    /// <summary>Verifies a session's outcome directly with Stripe rather than trusting anything
    /// the browser's redirect-back query string claims - the session id alone doesn't prove
    /// payment succeeded.</summary>
    Task<StripeCheckoutSessionStatus> GetSessionStatusAsync(string stripeAccountId, string sessionId, CancellationToken cancellationToken);
}

public sealed record StripeCheckoutSessionRequest(
    string StripeAccountId,
    Guid InvoiceId,
    string PublicToken,
    string InvoiceNumber,
    string Currency,
    decimal AmountDue,
    string SuccessUrl,
    string CancelUrl);

public sealed record StripeCheckoutSessionResult(string SessionId, string Url);

/// <summary>PublicTokenMetadata is compared against the invoice being confirmed - a session id
/// alone is opaque enough to not be guessable, but binding it to the invoice's own token via
/// Stripe-stored metadata stops a session created for one invoice from ever confirming a
/// different one. PayerEmail is whatever Stripe Checkout itself collected from the payer (IG-218's
/// receipt destination) - this app never asks for or stores it separately.</summary>
public sealed record StripeCheckoutSessionStatus(bool IsPaid, string? PublicTokenMetadata, decimal? AmountTotal, string? PayerEmail);
