using InvoiceApp.Application.Audit;
using InvoiceApp.Application.Documents;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Customers;
using InvoiceApp.Domain.Estimates;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Estimates;
using InvoiceApp.Infrastructure.Identity;
using InvoiceApp.Infrastructure.Persistence;
using InvoiceApp.Infrastructure.Tests.Businesses;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Tests.Estimates;

// IG-266 (Test conversion data integrity and traceability, subtask of IG-223): two conversions of
// the same Accepted estimate must never both create an invoice. The InMemory provider cannot show
// this - it has no row locks and no real concurrency - so this runs against the local Postgres
// container, skipping when it is unreachable (same fixture and skip policy as the other Postgres
// tests).
//
// The invoice service is a stub that records how many invoices it was asked to create and holds
// the first conversion open briefly, so the second request is guaranteed to reach the conditional
// claim while the first transaction still holds the estimate row.
public sealed class EstimateConversionConcurrencyTests : IClassFixture<PostgresAvailabilityFixture>, IAsyncLifetime
{
    private readonly PostgresAvailabilityFixture fixture;
    private readonly Guid userId = Guid.NewGuid();
    private readonly Guid businessId = Guid.NewGuid();
    private readonly Guid customerId = Guid.NewGuid();
    private readonly Guid estimateId = Guid.NewGuid();

    public EstimateConversionConcurrencyTests(PostgresAvailabilityFixture fixture)
    {
        this.fixture = fixture;
    }

    public async Task InitializeAsync()
    {
        if (!fixture.IsAvailable)
        {
            return;
        }

        await using var context = PostgresAvailabilityFixture.CreateContext();
        var now = DateTimeOffset.UtcNow;
        var email = $"estimate-conversion-{userId}@example.test";

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
            CreatedAt = now,
            UpdatedAt = now,
        });

        context.Businesses.Add(new Business
        {
            Id = businessId,
            UserId = userId,
            BusinessName = "Conversion Test Business",
            Country = "AU",
            DefaultCurrency = "AUD",
            CreatedAt = now,
            UpdatedAt = now,
        });

        context.Customers.Add(new Customer
        {
            Id = customerId,
            BusinessId = businessId,
            BusinessName = "Conversion Test Customer",
            IsArchived = false,
            CreatedAt = now,
            UpdatedAt = now,
        });

        context.Estimates.Add(new Estimate
        {
            Id = estimateId,
            BusinessId = businessId,
            CustomerId = customerId,
            EstimateNumber = "EST-RACE-1",
            Status = EstimateStatus.Accepted,
            IssueDate = new DateOnly(2030, 1, 1),
            ExpiryDate = new DateOnly(2030, 1, 15),
            Currency = "AUD",
            CustomerSnapshot = "{}",
            SellerSnapshot = "{}",
            DiscountType = DiscountType.None,
            Subtotal = 100,
            DiscountAmount = 0,
            TaxAmount = 0,
            TotalAmount = 100,
            CreatedAt = now,
            UpdatedAt = now,
        });

        await context.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        if (!fixture.IsAvailable)
        {
            return;
        }

        // Estimate first (it references the invoice and the customer), then the invoices, customer,
        // business and user - each of those is referenced by the row removed before it.
        await using var context = PostgresAvailabilityFixture.CreateContext();
        var estimate = await context.Estimates.FindAsync(estimateId);
        if (estimate is not null)
        {
            context.Estimates.Remove(estimate);
            await context.SaveChangesAsync();
        }

        var invoicesToRemove = await context.Invoices.Where(i => i.BusinessId == businessId).ToListAsync();
        context.Invoices.RemoveRange(invoicesToRemove);

        var customer = await context.Customers.FindAsync(customerId);
        if (customer is not null)
        {
            context.Customers.Remove(customer);
        }

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
    public async Task Two_concurrent_conversions_of_one_accepted_estimate_create_exactly_one_invoice()
    {
        Skip.IfNot(fixture.IsAvailable, "Local Postgres container is not reachable (docker invoiceapp-postgres on port 5433).");

        var invoices = new CountingInvoiceService(TimeSpan.FromMilliseconds(500), businessId, customerId);
        var audit = new NoOpAuditLogService();

        var first = AttemptConversionAsync(invoices, audit);
        var second = AttemptConversionAsync(invoices, audit);
        var outcomes = await Task.WhenAll(first, second);

        Assert.Single(outcomes, outcome => outcome.InvoiceId is not null);
        Assert.Single(outcomes, outcome => outcome.Conflict is not null);
        Assert.Equal(1, invoices.SaveCount);

        var winner = outcomes.Single(outcome => outcome.InvoiceId is not null).InvoiceId;
        await using var check = PostgresAvailabilityFixture.CreateContext();
        var estimate = await check.Estimates.AsNoTracking().SingleAsync(e => e.Id == estimateId);
        Assert.Equal(EstimateStatus.Converted, estimate.Status);
        Assert.Equal(winner, estimate.ConvertedInvoiceId);
    }

    // Each attempt gets its own context and service instance, like two real requests on separate
    // connections. Sharing one context would serialise them and hide the race.
    private async Task<ConversionOutcome> AttemptConversionAsync(CountingInvoiceService invoices, IAuditLogService audit)
    {
        await using var context = PostgresAvailabilityFixture.CreateContext();
        var service = new EstimateService(context, audit, invoices);

        try
        {
            var invoiceId = await service.ConvertToInvoiceAsync(userId, businessId, estimateId, CancellationToken.None);
            return new ConversionOutcome(invoiceId, null);
        }
        catch (ConflictException conflict)
        {
            return new ConversionOutcome(null, conflict);
        }
    }

    private sealed record ConversionOutcome(Guid? InvoiceId, ConflictException? Conflict);

    private sealed class NoOpAuditLogService : IAuditLogService
    {
        public Task RecordAsync(Guid? userId, Guid? businessId, string entityType, Guid? entityId, string action, object? metadata, CancellationToken cancellationToken)
            => Task.CompletedTask;
    }

    // Only SaveAsync is exercised by ConvertToInvoiceAsync. It writes a real invoice row so the
    // estimate's foreign key to invoices is satisfied, exactly as the real invoice service would.
    // The row is written on its own connection rather than inside the estimate's transaction, so
    // this does not exercise rollback of the invoice - only the race on the estimate claim.
    // Everything else is unreachable from this test, so it throws rather than returning a value
    // that could hide a wrong call.
    private sealed class CountingInvoiceService(TimeSpan delay, Guid businessId, Guid customerId) : IInvoiceService
    {
        private int saveCount;

        public int SaveCount => saveCount;

        public async Task<InvoiceDto> SaveAsync(Guid userId, Guid savedBusinessId, Guid? invoiceId, InvoiceSaveRequest request, CancellationToken cancellationToken)
        {
            Interlocked.Increment(ref saveCount);
            await Task.Delay(delay, cancellationToken);

            var now = DateTimeOffset.UtcNow;
            var invoice = new Invoice
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                CustomerId = customerId,
                InvoiceNumber = $"INV-RACE-{Guid.NewGuid():N}",
                Status = InvoiceStatus.Draft,
                IssueDate = request.IssueDate,
                DueDate = request.DueDate,
                Currency = request.Currency,
                Reference = request.Reference,
                CustomerSnapshot = "{}",
                SellerSnapshot = "{}",
                DiscountType = DiscountType.None,
                CreatedAt = now,
                UpdatedAt = now,
            };

            await using var context = PostgresAvailabilityFixture.CreateContext();
            context.Invoices.Add(invoice);
            await context.SaveChangesAsync(cancellationToken);

            return new InvoiceDto(
                invoice.Id, customerId, invoice.InvoiceNumber, invoice.Status,
                invoice.IssueDate, invoice.DueDate, invoice.Currency, invoice.Reference,
                0, 0, 0, 0, 0, 0, now, now);
        }

        public Task<InvoiceDetailDto> GetAsync(Guid userId, Guid businessId, Guid invoiceId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<InvoiceListResponse> ListAsync(Guid userId, Guid businessId, InvoiceListQuery query, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<InvoiceDto> CancelAsync(Guid userId, Guid businessId, Guid invoiceId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<InvoiceDetailDto> MarkIssuedAsync(Guid userId, Guid businessId, Guid invoiceId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task DeleteAsync(Guid userId, Guid businessId, Guid invoiceId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<InvoiceDto> DuplicateAsync(Guid userId, Guid businessId, Guid invoiceId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<HostedInvoiceDto> GetHostedInvoiceAsync(string token, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<InvoicePdfRequest> BuildHostedInvoicePdfRequestAsync(string token, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<InvoiceEmailContext> PrepareInvoiceEmailAsync(Guid userId, Guid businessId, Guid invoiceId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task RecordEmailSentAsync(Guid userId, Guid businessId, Guid invoiceId, InvoiceEmailRequest request, InvoiceEmailStatus status, string? errorMessage, CancellationToken cancellationToken, string? openToken = null) => throw new NotSupportedException();

        public Task RecordEmailOpenAsync(string openToken, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<IReadOnlyList<InvoiceEmailLogDto>> GetEmailHistoryAsync(Guid userId, Guid businessId, Guid invoiceId, CancellationToken cancellationToken) => throw new NotSupportedException();
    }
}
