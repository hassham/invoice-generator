using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructureConfiguration(builder.Configuration);
builder.Services.AddInfrastructurePersistence();

var app = builder.Build();

app.MapGet("/api/v1/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
