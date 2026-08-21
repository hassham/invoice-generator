using InvoiceApp.Api;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Infrastructure.HealthChecks;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructureConfiguration(builder.Configuration);
builder.Services.AddInfrastructurePersistence();
builder.Services.AddInfrastructureHealthChecks();

var app = builder.Build();

// Liveness: the process is running. No dependency checks - a dependency outage must not make the
// app look like it needs to be restarted.
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false,
    ResponseWriter = HealthCheckResponseWriter.Write,
});

// Readiness: dependencies required to serve requests are available (docs/SAD.md section 80).
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains(InfrastructureHealthChecksExtensions.ReadyTag),
    ResponseWriter = HealthCheckResponseWriter.Write,
});

app.Run();
