using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Tests.Businesses;

// IG-46: EF Core's InMemory provider (used by every other test in this project) cannot prove real
// concurrency safety - two "concurrent" InMemory operations never actually race the way two real
// Postgres connections do. This fixture points at the same invoiceapp-postgres docker container
// the app itself uses in local development (see appsettings.Development.json's connection
// string), reusing it rather than introducing Testcontainers, per explicit choice.
//
// Skip-not-fail when unreachable, deliberately: .github/workflows/ci.yml's backend job runs
// `dotnet test` with no Postgres service container defined, so a hard failure here would break
// every CI run. A local machine without the container running gets the same graceful skip -
// visible in test output as Skipped, not a silent Pass with no assertions actually run.
public sealed class PostgresAvailabilityFixture : IAsyncLifetime
{
    public const string ConnectionString = "Host=localhost;Port=5433;Database=invoiceapp;Username=invoiceapp;Password=invoiceapp";

    public bool IsAvailable { get; private set; }

    public async Task InitializeAsync()
    {
        try
        {
            await using var context = CreateContext();
            IsAvailable = await context.Database.CanConnectAsync();
        }
        catch
        {
            IsAvailable = false;
        }
    }

    public Task DisposeAsync() => Task.CompletedTask;

    public static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(ConnectionString)
            .UseSnakeCaseNamingConvention()
            .Options;
        return new ApplicationDbContext(options);
    }
}
