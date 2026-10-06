using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Invoicing;

public sealed class ReminderFailureService(ApplicationDbContext dbContext) : IReminderFailureService
{
    public async Task<List<ReminderFailureDto>> ListUnresolvedByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var failures = await dbContext.ReminderFailures
            .Where(rf => !rf.IsResolved)
            .Join(
                dbContext.Invoices.Where(i => i.BusinessId == businessId),
                rf => rf.InvoiceId,
                i => i.Id,
                (rf, i) => rf)
            .OrderByDescending(rf => rf.CreatedAt)
            .ToListAsync(cancellationToken);

        return failures.Select(MapToDto).ToList();
    }

    public async Task<ReminderFailureDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid failureId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var failure = await dbContext.ReminderFailures
            .Where(rf => rf.Id == failureId)
            .Join(
                dbContext.Invoices.Where(i => i.BusinessId == businessId),
                rf => rf.InvoiceId,
                i => i.Id,
                (rf, i) => rf)
            .FirstOrDefaultAsync(cancellationToken);

        if (failure == null)
            throw new InvalidOperationException("Reminder failure not found.");

        return MapToDto(failure);
    }

    public async Task ResolveAsync(
        Guid userId,
        Guid businessId,
        Guid failureId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var failure = await dbContext.ReminderFailures
            .Where(rf => rf.Id == failureId)
            .Join(
                dbContext.Invoices.Where(i => i.BusinessId == businessId),
                rf => rf.InvoiceId,
                i => i.Id,
                (rf, i) => rf)
            .FirstOrDefaultAsync(cancellationToken);

        if (failure == null)
            throw new InvalidOperationException("Reminder failure not found.");

        failure.IsResolved = true;
        failure.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static ReminderFailureDto MapToDto(ReminderFailure failure)
    {
        return new ReminderFailureDto(
            failure.Id,
            failure.InvoiceId,
            failure.ReminderRuleId,
            failure.FailureReason,
            failure.RetryCount,
            failure.MaxRetries,
            failure.IsResolved,
            failure.LastRetryAt,
            failure.CreatedAt);
    }
}
