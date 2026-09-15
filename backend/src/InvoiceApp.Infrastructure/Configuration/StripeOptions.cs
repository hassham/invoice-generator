namespace InvoiceApp.Infrastructure.Configuration;

/// <summary>
/// Governs Stripe Connect (IG-206/IG-219) - the platform's own test/live keys plus the OAuth
/// Client ID for the "Connect with Stripe" flow each business goes through. Same "optional, blank
/// by default" precedent as GoogleAuthenticationOptions/SmtpOptions: not validated on startup,
/// since every non-production environment (local dev without Stripe set up yet, CI, tests) must
/// still start and run normally with these left blank.
/// </summary>
public sealed class StripeOptions
{
    public const string SectionName = "Stripe";

    public string SecretKey { get; init; } = string.Empty;

    public string PublishableKey { get; init; } = string.Empty;

    public string ConnectClientId { get; init; } = string.Empty;
}
