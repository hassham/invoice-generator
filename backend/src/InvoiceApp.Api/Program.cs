using System.Text.Json.Serialization;
using InvoiceApp.Api;
using InvoiceApp.Api.Diagnostics;
using InvoiceApp.Api.Endpoints;
using InvoiceApp.Infrastructure.Audit;
using InvoiceApp.Infrastructure.Authentication;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Infrastructure.Customers;
using InvoiceApp.Infrastructure.Dashboard;
using InvoiceApp.Infrastructure.HealthChecks;
using InvoiceApp.Infrastructure.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using InvoiceApp.Infrastructure.RateLimiting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

// IG-43: required once at startup or QuestPDF throws on first use. Community is free for
// organizations under $1M USD annual gross revenue - worth revisiting if that changes.
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// Structured logging (docs/SAD.md section 76): scopes must be rendered for the correlation ID
// (section 78) added by CorrelationIdMiddleware to actually appear in log output - the default
// console formatter does not include them otherwise.
builder.Logging.AddSimpleConsole(options => options.IncludeScopes = true);

builder.Services.AddInfrastructureConfiguration(builder.Configuration);
builder.Services.AddInfrastructurePersistence();
builder.Services.AddInfrastructureAuthentication(builder.Configuration);
builder.Services.AddInfrastructureAudit();
builder.Services.AddInfrastructureCustomers();
builder.Services.AddInfrastructureInvoicing();
builder.Services.AddInfrastructureDashboard();
builder.Services.AddInfrastructureRateLimiting(builder.Configuration);
builder.Services.AddInfrastructureHealthChecks();

// IG-39: the templates endpoint is this app's first browser-based frontend-to-backend call, so no
// CORS policy existed until now. Matches the frontend's own default dev origin
// (NEXT_PUBLIC_SITE_URL in frontend/app/layout.tsx).
// IG-43: Content-Disposition must be explicitly exposed - it isn't in the CORS safelist browsers
// grant JS by default, so frontend/lib/invoicePdf.ts's fetch() couldn't read the filename from it
// without this, silently falling back to a generic name.
// IG-26: AllowCredentials() is required now that the frontend login/signup pages send
// credentials: "include" - without it the browser strips the Set-Cookie response header on
// cross-origin auth calls and the session cookie never persists, even though the login call
// itself still returns 200. Only compatible with an explicit WithOrigins() list (already the
// case here), never AllowAnyOrigin().
const string FrontendCorsPolicy = "Frontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
        policy.WithOrigins("http://localhost:3000").AllowAnyHeader().AllowAnyMethod().AllowCredentials().WithExposedHeaders("Content-Disposition"));
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Serializes enums (e.g. DiscountType, TaxCalculationMethod on the invoice calculation endpoint)
// as their string name rather than the default numeric ordinal - readable JSON, and a reordered
// enum can't silently change what a client sends/receives.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();

// CorrelationIdMiddleware first (outermost): UseExceptionHandler still catches everything
// downstream regardless of this order, but registering it second means a caught exception is
// handled (and logged) *inside* the correlation logging scope rather than after it has already
// unwound past that scope and been disposed - otherwise GlobalExceptionHandler's own log entry
// would be missing the CorrelationId enrichment that every other log statement gets.
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();

app.UseCors(FrontendCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapAuthEndpoints();
app.MapInvoiceEndpoints();
app.MapTemplateEndpoints();
app.MapDocumentEndpoints();
app.MapCustomerEndpoints();
app.MapDashboardEndpoints();

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
