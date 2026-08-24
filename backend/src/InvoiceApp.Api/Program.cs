using InvoiceApp.Api;
using InvoiceApp.Api.Diagnostics;
using InvoiceApp.Api.Endpoints;
using InvoiceApp.Infrastructure.Authentication;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Infrastructure.HealthChecks;
using InvoiceApp.Infrastructure.Persistence;
using InvoiceApp.Infrastructure.RateLimiting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

// Structured logging (docs/SAD.md section 76): scopes must be rendered for the correlation ID
// (section 78) added by CorrelationIdMiddleware to actually appear in log output - the default
// console formatter does not include them otherwise.
builder.Logging.AddSimpleConsole(options => options.IncludeScopes = true);

builder.Services.AddInfrastructureConfiguration(builder.Configuration);
builder.Services.AddInfrastructurePersistence();
builder.Services.AddInfrastructureAuthentication();
builder.Services.AddInfrastructureRateLimiting(builder.Configuration);
builder.Services.AddInfrastructureHealthChecks();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

// CorrelationIdMiddleware first (outermost): UseExceptionHandler still catches everything
// downstream regardless of this order, but registering it second means a caught exception is
// handled (and logged) *inside* the correlation logging scope rather than after it has already
// unwound past that scope and been disposed - otherwise GlobalExceptionHandler's own log entry
// would be missing the CorrelationId enrichment that every other log statement gets.
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapAuthEndpoints();

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

// Exposes the top-level-statement-generated Program class so WebApplicationFactory<Program> in
// InvoiceApp.Api.Tests can host this app in-process for real HTTP-pipeline authorization tests.
public partial class Program;
