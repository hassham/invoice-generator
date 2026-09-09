namespace InvoiceApp.Infrastructure.Configuration;

/// <summary>
/// Governs the rate limiter applied to docs/SAD.md section 112's "higher priority" authentication
/// endpoints (register, login, password reset) plus - since IG-71 - the anonymous, computationally
/// expensive PDF-generation endpoint (FSD section 87's "sensitive or expensive endpoints" rate
/// limiting requirement). Thresholds aren't specified anywhere in docs, so these are a
/// deliberately conservative default rather than a silently chosen one - override via the
/// "RateLimiting" configuration section if they prove too strict or too loose in practice.
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
