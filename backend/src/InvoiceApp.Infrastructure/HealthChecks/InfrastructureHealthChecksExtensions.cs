using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.HealthChecks;

public static class InfrastructureHealthChecksExtensions
{
    /// <summary>
    /// "ready" is the tag the Api composition root uses to select which checks back
    /// /health/ready (dependencies required to serve requests), as opposed to /health/live
    /// (the process is running), per docs/SAD.md section 80.
    /// </summary>
    public const string ReadyTag = "ready";

    public static IServiceCollection AddInfrastructureHealthChecks(this IServiceCollection services)
    {
        services
            .AddHealthChecks()
            .AddCheck<DatabaseHealthCheck>("database", tags: [ReadyTag]);

        return services;
    }
}
