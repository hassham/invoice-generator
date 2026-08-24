namespace InvoiceApp.Infrastructure.Configuration;

/// <summary>
/// Governs the rate limiter applied to docs/SAD.md section 112's "higher priority" authentication
/// endpoints (currently register and login; password reset and PDF generation will join once
/// built). Thresholds aren't specified anywhere in docs, so these are a deliberately conservative
/// default rather than a silently chosen one - override via the "RateLimiting" configuration
/// section if they prove too strict or too loose in practice.
/// </summary>
public sealed class RateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    public const string AuthPolicyName = "auth";

    // Plain setters, not init - IPostConfigureOptions/PostConfigure (used by
    // AuthenticatedRouteTestFactory to override PermitLimit for rate-limit tests) needs to
    // mutate an already-constructed instance.
    public int PermitLimit { get; set; } = 10;

    public int WindowSeconds { get; set; } = 60;

    // Requests over the limit are rejected immediately (429) rather than queued - queuing
    // authentication attempts only helps an attacker pace a brute-force attempt within the window.
    public int QueueLimit { get; set; }
}
