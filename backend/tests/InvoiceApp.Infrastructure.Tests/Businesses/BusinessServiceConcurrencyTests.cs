using InvoiceApp.Domain.Businesses;
using InvoiceApp.Infrastructure.Businesses;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Tests.Businesses;

// IG-140 (Test numbering concurrency and conflicts, subtask of IG-46): proves
// GenerateNextInvoiceNumberAsync's atomic UPDATE ... RETURNING fix is actually safe against real
// concurrent requests - something the InMemory provider used everywhere else in this project
// cannot demonstrate, since it has no genuine row-level locking or connection-level concurrency.
//
// Isolation: per-test row (unique Business.Id created in InitializeAsync, deleted in
// DisposeAsync), not a shared rollback transaction. A rollback transaction would force every
// "concurrent" call through the one connection/transaction that owns it, serializing them and
// defeating the entire point of this test - real concurrent requests use independent connections.
public sealed class BusinessServiceConcurrencyTests : IClassFixture<PostgresAvailabilityFixture>, IAsyncLifetime
{
    private readonly PostgresAvailabilityFixture fixture;
    private Guid businessId;
    private Guid userId;

    public BusinessServiceConcurrencyTests(PostgresAvailabilityFixture fixture)
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

        // business.businesses.user_id has a foreign key to identity.users - a row is required
        // there too, not just on Business. Inserted directly via EF (not UserManager) since this
        // test only needs a satisfiable foreign key, not a real, loggable-in account.
        var email = $"concurrency-test-{userId}@example.test";
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
            BusinessName = "Concurrency Test Business",
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

        // Business first - business.businesses.user_id -> identity.users is a Restrict FK
        // (BusinessConfiguration), so the user row can't be deleted while it still has a business.
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

    [SkippableFact]
    public async Task GenerateNextInvoiceNumberAsync_UnderConcurrentLoad_NeverProducesDuplicateNumbers()
    {
        Skip.IfNot(
            fixture.IsAvailable,
            $"Postgres is not reachable at '{PostgresAvailabilityFixture.ConnectionString}' - start the invoiceapp-postgres docker container to run this test.");

        const int concurrentRequests = 30;

        // Each simulated "request" gets its own DbContext/connection, exactly like a real
        // concurrent HTTP request would - a single shared DbContext is not thread-safe and would
        // not actually exercise the race this test exists to catch.
        var tasks = Enumerable.Range(0, concurrentRequests).Select(async _ =>
        {
            await using var context = PostgresAvailabilityFixture.CreateContext();
            var service = new BusinessService(context);
            var result = await service.GenerateNextInvoiceNumberAsync(userId, CancellationToken.None);
            return result.InvoiceNumber;
        });

        var results = await Task.WhenAll(tasks);

        Assert.Equal(concurrentRequests, results.Distinct().Count());
    }
}
