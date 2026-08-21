using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace InvoiceApp.Api;

/// <summary>
/// Writes health check results as JSON distinguishing Healthy/Degraded/Unhealthy per check
/// (docs/SAD.md section 80, IG-81 completion criteria). Deliberately serializes only the check
/// name and status - never HealthReportEntry.Description/Exception - so a failure can never leak
/// a connection string or other sensitive detail through this endpoint, even if some future check
/// forgets to keep its own description text generic.
/// </summary>
public static class HealthCheckResponseWriter
{
    private static readonly JsonSerializerOptions SerializerOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public static Task Write(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";

        var payload = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(entry => new
            {
                name = entry.Key,
                status = entry.Value.Status.ToString(),
            }),
        };

        return context.Response.WriteAsync(JsonSerializer.Serialize(payload, SerializerOptions));
    }
}
