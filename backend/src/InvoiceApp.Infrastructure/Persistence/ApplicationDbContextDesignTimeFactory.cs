using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace InvoiceApp.Infrastructure.Persistence;

/// <summary>
/// Lets `dotnet ef` construct ApplicationDbContext outside the running host. Reads configuration
/// the same way the Api composition root does (appsettings.json, appsettings.{Environment}.json,
/// user secrets, environment variables) rather than depending on the host's DI-resolved
/// IOptions&lt;DatabaseOptions&gt;/ValidateOnStart pipeline, which the design-time tooling does not run.
/// Run `dotnet ef` with `--startup-project src/InvoiceApp.Api` so the current directory used below
/// resolves to the Api project (where appsettings*.json and the UserSecretsId live).
/// </summary>
public sealed class ApplicationDbContextDesignTimeFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    private const string ApiUserSecretsId = "1bb70798-d419-459c-9213-a684a846ba1a";

    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddUserSecrets(ApiUserSecretsId)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetSection("ConnectionStrings")["Default"]
            ?? throw new InvalidOperationException(
                "ConnectionStrings:Default is required to run design-time EF Core tooling. " +
                "Run dotnet ef with --startup-project src/InvoiceApp.Api, and set the value in " +
                "appsettings.Development.json or via dotnet user-secrets.");

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();

        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
