using InvoiceApp.Domain.Businesses;
using InvoiceApp.Infrastructure.Identity;
using InvoiceApp.Infrastructure.Reporting;
using InvoiceApp.Infrastructure.Tests.Businesses;

namespace InvoiceApp.Infrastructure.Tests.Reporting;

/// <summary>
/// IG-275: proves every reporting query actually translates to SQL, against the real Postgres
/// container rather than the InMemory provider.
///
/// This class exists because of two bugs found within an hour of each other, both of which the
/// whole four-command gate was green for:
///
/// 1. <c>GetOutstandingReportAsync</c> and <c>GetOverdueReportAsync</c> sorted *after* projecting
///    into a DTO constructor. PostgreSQL cannot translate that, so both endpoints returned 500 for
///    every real caller - in an app whose reports pages shipped - while InMemory evaluated it
///    client-side and reported success.
/// 2. <c>GetRevenueByCustomerAsync</c> used a translated <c>GroupBy(...).ToDictionaryAsync(...)</c>
///    that PostgreSQL runs but InMemory rejects, so that method could not be endpoint-tested at all.
///
/// The two providers disagree in *both directions*. A passing InMemory test says nothing about
/// whether a query runs in production, and a failing one does not prove the query is wrong. The
/// only cure is to execute each query against Postgres, which is all these tests do - the figures
/// are asserted by the endpoint tests, so an empty account is enough here. A query that cannot be
/// translated throws <c>InvalidOperationException</c> on execution, whatever the data.
///
/// Skipped rather than failed when Postgres is unreachable, matching
/// <see cref="PostgresAvailabilityFixture"/> - CI defines no Postgres service container.
/// </summary>
public sealed class ReportingQueryTranslationTests : IClassFixture<PostgresAvailabilityFixture>, IAsyncLifetime
{
    private readonly PostgresAvailabilityFixture fixture;
    private Guid userId;
    private Guid businessId;

    public ReportingQueryTranslationTests(PostgresAvailabilityFixture fixture)
    {
        this.fixture = fixture;
    }

    public async Task InitializeAsync()
    {
        if (!fixture.IsAvailable)
        {
            return;
        }

        userId = Guid.NewGuid();
        businessId = Guid.NewGuid();

        await using var context = PostgresAvailabilityFixture.CreateContext();

        // Every reporting method resolves the business first and throws NotFoundException without
        // one, so the query under test would never be reached. A user row is required too:
        // business.businesses.user_id has a Restrict FK to identity.users.
        var email = $"report-translation-{userId}@example.test";
        context.Users.Add(new ApplicationUser
        {
            Id = userId,
            UserName = email,
            NormalizedUserName = email.ToUpperInvariant(),
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            EmailConfirmed = true,
            SecurityStamp = Guid.NewGuid().ToString("N"),
            ConcurrencyStamp = Guid.NewGuid().ToString("N"),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        context.Businesses.Add(new Business
        {
            Id = businessId,
            UserId = userId,
            BusinessName = "Report Translation Test Business",
            Country = "AU",
            DefaultCurrency = "AUD",
            InvoicePrefix = "INV-",
            NextInvoiceNumber = 1,
            InvoiceNumberPadding = 4,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        await context.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        if (!fixture.IsAvailable)
        {
            return;
        }

        await using var context = PostgresAvailabilityFixture.CreateContext();

        // Business before user: the FK is Restrict, so the user cannot go while it owns a business.
        var business = await context.Businesses.FindAsync(businessId);
        if (business is not null)
        {
            context.Businesses.Remove(business);
        }

        var user = await context.Users.FindAsync(userId);
        if (user is not null)
        {
            context.Users.Remove(user);
        }

        await context.SaveChangesAsync();
    }

    private void SkipIfUnavailable() => Skip.IfNot(
        fixture.IsAvailable,
        $"Postgres is not reachable at '{PostgresAvailabilityFixture.ConnectionString}' - start the invoiceapp-postgres docker container to run this test.");

    [SkippableFact]
    public async Task GetRevenueReportAsync_translates_to_sql()
    {
        SkipIfUnavailable();
        await using var context = PostgresAvailabilityFixture.CreateContext();
        var service = new ReportingService(context);

        var report = await service.GetRevenueReportAsync(
            userId, "month", new DateOnly(2030, 1, 1), new DateOnly(2030, 3, 31), CancellationToken.None);

        Assert.Equal("AUD", report.Currency);
        Assert.Equal(3, report.Periods.Count);
    }

    [SkippableTheory]
    [InlineData("month")]
    [InlineData("quarter")]
    [InlineData("year")]
    public async Task GetRevenueReportAsync_translates_for_every_period_type(string periodType)
    {
        SkipIfUnavailable();
        await using var context = PostgresAvailabilityFixture.CreateContext();
        var service = new ReportingService(context);

        var report = await service.GetRevenueReportAsync(
            userId, periodType, new DateOnly(2030, 1, 1), new DateOnly(2031, 12, 31), CancellationToken.None);

        Assert.NotEmpty(report.Periods);
    }

    [SkippableFact]
    public async Task GetOutstandingReportAsync_translates_to_sql()
    {
        SkipIfUnavailable();
        await using var context = PostgresAvailabilityFixture.CreateContext();
        var service = new ReportingService(context);

        // The regression this class was written for. Before IG-275 this threw
        // "The LINQ expression 'DbSet<Invoice>()' could not be translated" and the endpoint 500'd.
        var invoices = await service.GetOutstandingReportAsync(userId, CancellationToken.None);

        Assert.Empty(invoices);
    }

    [SkippableFact]
    public async Task GetOverdueReportAsync_translates_to_sql()
    {
        SkipIfUnavailable();
        await using var context = PostgresAvailabilityFixture.CreateContext();
        var service = new ReportingService(context);

        var invoices = await service.GetOverdueReportAsync(userId, CancellationToken.None);

        Assert.Empty(invoices);
    }

    [SkippableFact]
    public async Task GetRevenueByCustomerAsync_translates_to_sql()
    {
        SkipIfUnavailable();
        await using var context = PostgresAvailabilityFixture.CreateContext();
        var service = new ReportingService(context);

        var customers = await service.GetRevenueByCustomerAsync(
            userId, new DateOnly(2030, 1, 1), new DateOnly(2030, 12, 31), CancellationToken.None);

        Assert.Empty(customers);
    }

    [SkippableFact]
    public async Task GetTaxSummaryAsync_translates_to_sql()
    {
        SkipIfUnavailable();
        await using var context = PostgresAvailabilityFixture.CreateContext();
        var service = new ReportingService(context);

        var summary = await service.GetTaxSummaryAsync(
            userId, new DateOnly(2030, 1, 1), new DateOnly(2030, 12, 31), CancellationToken.None);

        Assert.Equal("AUD", summary.Currency);
        Assert.Equal(0m, summary.TotalTaxCollected);
    }
}
