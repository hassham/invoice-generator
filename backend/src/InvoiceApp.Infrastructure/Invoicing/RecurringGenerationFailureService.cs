using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Invoicing;

/// <summary>
/// IG-311: the read side of recurring generation failures. Ownership is established by joining
/// through the schedule to the business, the same way <see cref="ReminderFailureService"/> joins
/// through the invoice — a failure row carries no business id of its own.
/// </summary>
public sealed class RecurringGenerationFailureService(ApplicationDbContext dbContext) : IRecurringGenerationFailureService
{
    public async Task<List<RecurringGenerationFailureDto>> ListUnresolvedByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken)
    {
        await EnsureOwnedBusinessAsync(userId, businessId, cancellationToken);

        var failures = await OwnedFailures(businessId)
            .Where(f => !f.IsResolved)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);

        return failures.Select(MapToDto).ToList();
    }

    public async Task<RecurringGenerationFailureDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid failureId,
        CancellationToken cancellationToken)
    {
        await EnsureOwnedBusinessAsync(userId, businessId, cancellationToken);

        var failure = await OwnedFailures(businessId)
            .FirstOrDefaultAsync(f => f.Id == failureId, cancellationToken)
            ?? throw new InvalidOperationException("Recurring generation failure not found.");

        return MapToDto(failure);
    }

    public async Task ResolveAsync(
        Guid userId,
        Guid businessId,
        Guid failureId,
        CancellationToken cancellationToken)
    {
        await EnsureOwnedBusinessAsync(userId, businessId, cancellationToken);

        var failure = await OwnedFailures(businessId)
            .FirstOrDefaultAsync(f => f.Id == failureId, cancellationToken)
            ?? throw new InvalidOperationException("Recurring generation failure not found.");

        failure.IsResolved = true;
        failure.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureOwnedBusinessAsync(Guid userId, Guid businessId, CancellationToken cancellationToken)
    {
        var owned = await dbContext.Businesses
            .AnyAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (!owned)
            throw new InvalidOperationException("Business not found or access denied.");
    }

    private IQueryable<RecurringGenerationFailure> OwnedFailures(Guid businessId) =>
        from failure in dbContext.RecurringGenerationFailures
        join schedule in dbContext.RecurringSchedules.Where(rs => rs.BusinessId == businessId)
            on failure.RecurringScheduleId equals schedule.Id
        select failure;

    private static RecurringGenerationFailureDto MapToDto(RecurringGenerationFailure failure) => new(
        failure.Id,
        failure.RecurringScheduleId,
        failure.FailureReason,
        failure.RetryCount,
        failure.MaxRetries,
        failure.IsResolved,
        failure.LastRetryAt,
        failure.CreatedAt);
}
