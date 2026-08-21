using System.Diagnostics;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace InvoiceApp.Infrastructure.HealthChecks;

/// <summary>
/// Reports database connectivity per docs/SAD.md section 79/80. Distinguishes three states:
/// Unhealthy (cannot connect), Degraded (connects, but slower than expected), Healthy. Result
/// descriptions are static, generic strings - never the connection string or the underlying
/// exception - so a failure is reported without disclosing secrets (IG-81 completion criteria).
/// </summary>
public sealed class DatabaseHealthCheck(ApplicationDbContext dbContext) : IHealthCheck
{
    private static readonly TimeSpan DegradedThreshold = TimeSpan.FromMilliseconds(500);

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        bool canConnect;

        try
        {
            canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
        }
        catch
        {
            return HealthCheckResult.Unhealthy("Database connectivity check failed.");
        }

        return Evaluate(canConnect, stopwatch.Elapsed);
    }

    public static HealthCheckResult Evaluate(bool canConnect, TimeSpan elapsed)
    {
        if (!canConnect)
        {
            return HealthCheckResult.Unhealthy("Database connectivity check failed.");
        }

        return elapsed > DegradedThreshold
            ? HealthCheckResult.Degraded($"Database responded slowly ({elapsed.TotalMilliseconds:F0}ms).")
            : HealthCheckResult.Healthy();
    }
}
