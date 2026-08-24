using System.Threading.RateLimiting;
using InvoiceApp.Infrastructure.Configuration;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace InvoiceApp.Infrastructure.RateLimiting;

/// <summary>
/// Registers the "auth" rate-limit policy (docs/SAD.md section 112) applied to register and
/// login. Partitioned by client IP since both endpoints run before any user identity exists.
/// </summary>
public static class InfrastructureRateLimitingExtensions
{
    public static IServiceCollection AddInfrastructureRateLimiting(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddOptions<RateLimitingOptions>()
            .BindConfiguration(RateLimitingOptions.SectionName);

        services.AddRateLimiter(limiterOptions =>
        {
            limiterOptions.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            limiterOptions.AddPolicy(RateLimitingOptions.AuthPolicyName, httpContext =>
            {
                var options = httpContext.RequestServices
                    .GetRequiredService<IOptions<RateLimitingOptions>>().Value;
                var partitionKey = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = options.PermitLimit,
                    Window = TimeSpan.FromSeconds(options.WindowSeconds),
                    QueueLimit = options.QueueLimit,
                });
            });
        });

        return services;
    }
}
